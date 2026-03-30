import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import { parseFeed } from "./feed-parser";
import { generateId } from "../lib/utils";
import type { Database } from "../lib/types";

interface FetchResult {
  feedId: string;
  newEntries: number;
  error?: string;
}

/**
 * Fetch and parse a single feed, inserting new entries into D1.
 * Uses conditional GET (ETag / If-Modified-Since) to avoid re-fetching unchanged feeds.
 */
export async function fetchFeed(
  db: Database,
  feed: typeof schema.feeds.$inferSelect,
): Promise<FetchResult> {
  try {
    const headers: HeadersInit = {
      "User-Agent": "Ruminate/1.0 (RSS Reader; +https://github.com/ruminate)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    };

    if (feed.etag) {
      headers["If-None-Match"] = feed.etag;
    }
    if (feed.lastModified) {
      headers["If-Modified-Since"] = feed.lastModified;
    }

    const response = await fetch(feed.url, { headers });

    // 304 Not Modified — nothing new
    if (response.status === 304) {
      await db
        .update(schema.feeds)
        .set({ lastFetchedAt: new Date(), errorCount: 0 })
        .where(eq(schema.feeds.id, feed.id));

      return { feedId: feed.id, newEntries: 0 };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const parsed = parseFeed(xml);

    // Update feed metadata
    const newEtag = response.headers.get("ETag");
    const newLastModified = response.headers.get("Last-Modified");

    await db
      .update(schema.feeds)
      .set({
        title: feed.title === feed.url ? parsed.title : feed.title, // Don't override user-set titles
        siteUrl: parsed.siteUrl,
        description: parsed.description,
        lastFetchedAt: new Date(),
        etag: newEtag ?? feed.etag,
        lastModified: newLastModified ?? feed.lastModified,
        errorCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(schema.feeds.id, feed.id));

    // Insert new entries (skip duplicates by guid)
    let newEntries = 0;
    for (const entry of parsed.entries) {
      const existing = await db
        .select({ id: schema.entries.id })
        .from(schema.entries)
        .where(
          and(
            eq(schema.entries.feedId, feed.id),
            eq(schema.entries.guid, entry.guid),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(schema.entries).values({
          id: generateId(),
          feedId: feed.id,
          userId: feed.userId,
          guid: entry.guid,
          url: entry.url,
          title: entry.title,
          author: entry.author,
          contentSnippet: entry.contentSnippet,
          publishedAt: entry.publishedAt,
        });
        newEntries++;
      }
    }

    return { feedId: feed.id, newEntries };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    // Increment error count
    await db
      .update(schema.feeds)
      .set({
        errorCount: feed.errorCount + 1,
        lastFetchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.feeds.id, feed.id));

    return { feedId: feed.id, newEntries: 0, error: errorMsg };
  }
}

/**
 * Refresh all feeds for a user. Designed to run inside waitUntil().
 */
export async function refreshAllFeeds(
  db: Database,
  userId: string,
): Promise<FetchResult[]> {
  const userFeeds = await db
    .select()
    .from(schema.feeds)
    .where(eq(schema.feeds.userId, userId));

  // Fetch feeds in parallel, but limit concurrency to avoid overwhelming
  const BATCH_SIZE = 10;
  const results: FetchResult[] = [];

  for (let i = 0; i < userFeeds.length; i += BATCH_SIZE) {
    const batch = userFeeds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((feed) => fetchFeed(db, feed)),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }
  }

  return results;
}
