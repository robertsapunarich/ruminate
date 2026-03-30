import { Hono } from "hono";
import { eq, and, like, desc } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AppContext } from "../lib/types";

const search = new Hono<AppContext>();

/**
 * GET /api/search?q=query&type=all|entries|bookmarks
 * Search across entry and bookmark titles.
 */
search.get("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const url = new URL(c.req.url);

  const query = url.searchParams.get("q");
  const type = url.searchParams.get("type") ?? "all";

  if (!query?.trim()) {
    return c.json({ results: [] });
  }

  const pattern = `%${query.trim()}%`;
  const results: Array<{
    type: "entry" | "bookmark";
    id: string;
    title: string;
    url: string;
    feedTitle?: string;
    createdAt: Date | null;
  }> = [];

  if (type === "all" || type === "entries") {
    const entryResults = await db
      .select({
        id: schema.entries.id,
        title: schema.entries.title,
        url: schema.entries.url,
        createdAt: schema.entries.createdAt,
      })
      .from(schema.entries)
      .where(
        and(
          eq(schema.entries.userId, user.id),
          like(schema.entries.title, pattern),
        ),
      )
      .orderBy(desc(schema.entries.publishedAt))
      .limit(20);

    for (const entry of entryResults) {
      results.push({
        type: "entry",
        id: entry.id,
        title: entry.title,
        url: entry.url,
        createdAt: entry.createdAt,
      });
    }
  }

  if (type === "all" || type === "bookmarks") {
    const bookmarkResults = await db
      .select({
        id: schema.bookmarks.id,
        title: schema.bookmarks.title,
        url: schema.bookmarks.url,
        createdAt: schema.bookmarks.createdAt,
      })
      .from(schema.bookmarks)
      .where(
        and(
          eq(schema.bookmarks.userId, user.id),
          like(schema.bookmarks.title, pattern),
        ),
      )
      .orderBy(desc(schema.bookmarks.createdAt))
      .limit(20);

    for (const bookmark of bookmarkResults) {
      results.push({
        type: "bookmark",
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        createdAt: bookmark.createdAt,
      });
    }
  }

  return c.json({ results });
});

export default search;
