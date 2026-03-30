import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../db/schema";
import { parsePagination } from "../lib/utils";
import type { AppContext } from "../lib/types";

const entries = new Hono<AppContext>();

/**
 * GET /api/entries — List entries for the current user.
 * Query params:
 *   - feedId: filter by feed
 *   - unread: "true" to show only unread
 *   - starred: "true" to show only starred
 *   - offset/limit: pagination
 */
entries.get("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const url = new URL(c.req.url);
  const { offset, limit } = parsePagination(url);

  const feedId = url.searchParams.get("feedId");
  const unread = url.searchParams.get("unread");
  const starred = url.searchParams.get("starred");

  let query = db
    .select()
    .from(schema.entries)
    .where(eq(schema.entries.userId, user.id))
    .orderBy(desc(schema.entries.publishedAt))
    .limit(limit)
    .offset(offset);

  // Build conditions
  const conditions = [eq(schema.entries.userId, user.id)];

  if (feedId) {
    conditions.push(eq(schema.entries.feedId, feedId));
  }
  if (unread === "true") {
    conditions.push(eq(schema.entries.isRead, false));
  }
  if (starred === "true") {
    conditions.push(eq(schema.entries.isStarred, true));
  }

  const items = await db
    .select()
    .from(schema.entries)
    .where(and(...conditions))
    .orderBy(desc(schema.entries.publishedAt))
    .limit(limit)
    .offset(offset);

  return c.json({ items, offset, limit });
});

/**
 * GET /api/entries/:id — Get a single entry.
 */
entries.get("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const entryId = c.req.param("id");

  const [entry] = await db
    .select()
    .from(schema.entries)
    .where(
      and(eq(schema.entries.id, entryId), eq(schema.entries.userId, user.id)),
    )
    .limit(1);

  if (!entry) {
    return c.json({ error: "Entry not found" }, 404);
  }

  return c.json(entry);
});

/**
 * PUT /api/entries/:id — Update entry (mark read/unread, star/unstar).
 * Body: { isRead?: boolean, isStarred?: boolean }
 */
entries.put("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const entryId = c.req.param("id");
  const body = await c.req.json<{ isRead?: boolean; isStarred?: boolean }>();

  const [entry] = await db
    .select()
    .from(schema.entries)
    .where(
      and(eq(schema.entries.id, entryId), eq(schema.entries.userId, user.id)),
    )
    .limit(1);

  if (!entry) {
    return c.json({ error: "Entry not found" }, 404);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.isRead !== undefined) updates.isRead = body.isRead;
  if (body.isStarred !== undefined) updates.isStarred = body.isStarred;

  await db
    .update(schema.entries)
    .set(updates)
    .where(eq(schema.entries.id, entryId));

  return c.json({ ...entry, ...updates });
});

/**
 * PUT /api/entries/mark-read — Bulk mark entries as read.
 * Body: { feedId?: string, entryIds?: string[], all?: boolean }
 */
entries.put("/mark-read", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = await c.req.json<{
    feedId?: string;
    entryIds?: string[];
    all?: boolean;
  }>();

  if (body.all) {
    await db
      .update(schema.entries)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.entries.userId, user.id),
          eq(schema.entries.isRead, false),
        ),
      );
  } else if (body.feedId) {
    await db
      .update(schema.entries)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.entries.userId, user.id),
          eq(schema.entries.feedId, body.feedId),
          eq(schema.entries.isRead, false),
        ),
      );
  } else if (body.entryIds?.length) {
    // Mark specific entries — do it in a loop since D1 doesn't support IN easily with Drizzle
    for (const id of body.entryIds) {
      await db
        .update(schema.entries)
        .set({ isRead: true, updatedAt: new Date() })
        .where(
          and(eq(schema.entries.id, id), eq(schema.entries.userId, user.id)),
        );
    }
  }

  return c.json({ ok: true });
});

export default entries;
