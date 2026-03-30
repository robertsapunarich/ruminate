import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { parseFeed } from "../services/feed-parser";
import { discoverFeed } from "../services/feed-discovery";
import { fetchFeed, refreshAllFeeds } from "../services/feed-fetcher";
import { generateId } from "../lib/utils";
import type { AppContext } from "../lib/types";

const feeds = new Hono<AppContext>();

/**
 * GET /api/feeds — List all feeds for the current user.
 */
feeds.get("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const userFeeds = await db
    .select()
    .from(schema.feeds)
    .where(eq(schema.feeds.userId, user.id))
    .orderBy(schema.feeds.title);

  return c.json({ items: userFeeds });
});

/**
 * POST /api/feeds — Subscribe to a new feed.
 * Body: { url: string, title?: string }
 *
 * Accepts either a direct feed URL or a website URL.
 * If given a website, auto-discovers the RSS/Atom feed via:
 *   1. <link rel="alternate"> tags in HTML
 *   2. Common feed paths (/feed, /feed.xml, /rss, etc.)
 */
feeds.post("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = await c.req.json<{ url: string; title?: string }>();

  if (!body.url) {
    return c.json({ error: "url is required" }, 400);
  }

  // Discover the actual feed URL (handles HTML pages, direct feeds, etc.)
  let feedUrl: string;
  let feedBody: string;

  try {
    const discovery = await discoverFeed(body.url);
    feedUrl = discovery.feedUrl;
    feedBody = discovery.body;
  } catch (err) {
    return c.json(
      {
        error: err instanceof Error ? err.message : "Failed to discover feed",
      },
      400,
    );
  }

  // Check for duplicate using the resolved feed URL
  const existing = await db
    .select()
    .from(schema.feeds)
    .where(
      and(eq(schema.feeds.userId, user.id), eq(schema.feeds.url, feedUrl)),
    )
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "You are already subscribed to this feed" }, 409);
  }

  // Parse the feed we already fetched during discovery
  const parsed = parseFeed(feedBody);

  const feed = {
    id: generateId(),
    userId: user.id,
    url: feedUrl,
    title: body.title ?? parsed.title,
    siteUrl: parsed.siteUrl,
    description: parsed.description,
  };

  await db.insert(schema.feeds).values(feed);

  // Fetch entries in the background
  const insertedFeed = (
    await db
      .select()
      .from(schema.feeds)
      .where(eq(schema.feeds.id, feed.id))
      .limit(1)
  )[0];

  c.executionCtx.waitUntil(fetchFeed(db, insertedFeed));

  return c.json(feed, 201);
});

/**
 * GET /api/feeds/:id — Get a single feed.
 */
feeds.get("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const feedId = c.req.param("id");

  const [feed] = await db
    .select()
    .from(schema.feeds)
    .where(and(eq(schema.feeds.id, feedId), eq(schema.feeds.userId, user.id)))
    .limit(1);

  if (!feed) {
    return c.json({ error: "Feed not found" }, 404);
  }

  return c.json(feed);
});

/**
 * PUT /api/feeds/:id — Update a feed (title override).
 */
feeds.put("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const feedId = c.req.param("id");
  const body = await c.req.json<{ title?: string }>();

  const [feed] = await db
    .select()
    .from(schema.feeds)
    .where(and(eq(schema.feeds.id, feedId), eq(schema.feeds.userId, user.id)))
    .limit(1);

  if (!feed) {
    return c.json({ error: "Feed not found" }, 404);
  }

  await db
    .update(schema.feeds)
    .set({ title: body.title ?? feed.title, updatedAt: new Date() })
    .where(eq(schema.feeds.id, feedId));

  return c.json({ ...feed, title: body.title ?? feed.title });
});

/**
 * DELETE /api/feeds/:id — Unsubscribe from a feed.
 * This cascades to delete all entries for this feed.
 */
feeds.delete("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const feedId = c.req.param("id");

  const [feed] = await db
    .select()
    .from(schema.feeds)
    .where(and(eq(schema.feeds.id, feedId), eq(schema.feeds.userId, user.id)))
    .limit(1);

  if (!feed) {
    return c.json({ error: "Feed not found" }, 404);
  }

  await db.delete(schema.feeds).where(eq(schema.feeds.id, feedId));

  return c.json({ ok: true });
});

/**
 * POST /api/feeds/:id/refresh — Refresh a single feed.
 */
feeds.post("/:id/refresh", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const feedId = c.req.param("id");

  const [feed] = await db
    .select()
    .from(schema.feeds)
    .where(and(eq(schema.feeds.id, feedId), eq(schema.feeds.userId, user.id)))
    .limit(1);

  if (!feed) {
    return c.json({ error: "Feed not found" }, 404);
  }

  const result = await fetchFeed(db, feed);

  return c.json(result);
});

/**
 * POST /api/feeds/refresh — Refresh all feeds (background).
 */
feeds.post("/refresh", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const userFeeds = await db
    .select()
    .from(schema.feeds)
    .where(eq(schema.feeds.userId, user.id));

  c.executionCtx.waitUntil(refreshAllFeeds(db, user.id));

  return c.json({ refreshing: true, feedCount: userFeeds.length });
});

export default feeds;
