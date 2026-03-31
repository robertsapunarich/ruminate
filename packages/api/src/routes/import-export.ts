import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { parseOpml, generateOpml } from "../services/opml";
import { fetchFeed } from "../services/feed-fetcher";
import { generateId } from "../lib/utils";
import type { AppContext } from "../lib/types";
import type { ImportResult } from "@ruminate/shared";

const importExport = new Hono<AppContext>();

/**
 * POST /api/import/opml — Import feeds from an OPML file.
 * Accepts the OPML XML as the raw request body (Content-Type: text/xml or application/xml).
 * Also accepts multipart/form-data with a "file" field.
 */
importExport.post("/import/opml", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  let opmlText: string;

  const contentType = c.req.header("Content-Type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    const file = formData.get("file") as unknown;
    if (!file || typeof file === "string") {
      return c.json({ error: "No file provided" }, 400);
    }
    // Workers FormData returns a File/Blob with .text()
    opmlText = await (file as Blob).text();
  } else {
    opmlText = await c.req.text();
  }

  if (!opmlText.trim()) {
    return c.json({ error: "Empty OPML body" }, 400);
  }

  const opmlFeeds = parseOpml(opmlText);

  if (opmlFeeds.length === 0) {
    return c.json({ error: "No feeds found in OPML file" }, 400);
  }

  // Get existing feed URLs for this user to skip duplicates
  const existingFeeds = await db
    .select({ url: schema.feeds.url })
    .from(schema.feeds)
    .where(eq(schema.feeds.userId, user.id));

  const existingUrls = new Set(
    existingFeeds.map((f) => f.url.toLowerCase()),
  );

  const result: ImportResult = {
    total: opmlFeeds.length,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  for (const opmlFeed of opmlFeeds) {
    if (existingUrls.has(opmlFeed.xmlUrl.toLowerCase())) {
      result.skipped++;
      continue;
    }

    try {
      const feedId = generateId();

      await db.insert(schema.feeds).values({
        id: feedId,
        userId: user.id,
        url: opmlFeed.xmlUrl,
        title: opmlFeed.title,
        siteUrl: opmlFeed.htmlUrl,
        description: opmlFeed.description,
      });

      // Fetch entries in the background
      const [insertedFeed] = await db
        .select()
        .from(schema.feeds)
        .where(eq(schema.feeds.id, feedId))
        .limit(1);

      c.executionCtx.waitUntil(fetchFeed(db, insertedFeed));

      result.imported++;
      existingUrls.add(opmlFeed.xmlUrl.toLowerCase());
    } catch (err) {
      result.errors.push(
        `${opmlFeed.title}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  return c.json(result);
});

/**
 * GET /api/export/opml — Export all feeds as OPML 2.0.
 */
importExport.get("/export/opml", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const userFeeds = await db
    .select({
      title: schema.feeds.title,
      url: schema.feeds.url,
      siteUrl: schema.feeds.siteUrl,
      description: schema.feeds.description,
    })
    .from(schema.feeds)
    .where(eq(schema.feeds.userId, user.id))
    .orderBy(schema.feeds.title);

  const opml = generateOpml(userFeeds, user.displayName ?? undefined);

  return new Response(opml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ruminate-feeds.opml"',
    },
  });
});

export default importExport;
