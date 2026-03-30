import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AppContext } from "../lib/types";

const tags = new Hono<AppContext>();

/**
 * GET /api/tags — List all tags for the current user with bookmark counts.
 */
tags.get("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const result = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      createdAt: schema.tags.createdAt,
      count: sql<number>`count(${schema.bookmarkTags.bookmarkId})`.as("count"),
    })
    .from(schema.tags)
    .leftJoin(schema.bookmarkTags, eq(schema.tags.id, schema.bookmarkTags.tagId))
    .where(eq(schema.tags.userId, user.id))
    .groupBy(schema.tags.id)
    .orderBy(schema.tags.name);

  return c.json({ items: result });
});

/**
 * PUT /api/tags/:id — Rename a tag.
 */
tags.put("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const tagId = c.req.param("id");
  const body = await c.req.json<{ name: string }>();

  if (!body.name?.trim()) {
    return c.json({ error: "name is required" }, 400);
  }

  const [tag] = await db
    .select()
    .from(schema.tags)
    .where(and(eq(schema.tags.id, tagId), eq(schema.tags.userId, user.id)))
    .limit(1);

  if (!tag) {
    return c.json({ error: "Tag not found" }, 404);
  }

  const normalized = body.name.toLowerCase().trim();

  await db
    .update(schema.tags)
    .set({ name: normalized })
    .where(eq(schema.tags.id, tagId));

  return c.json({ ...tag, name: normalized });
});

/**
 * DELETE /api/tags/:id — Delete a tag (removes from all bookmarks/entries).
 */
tags.delete("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const tagId = c.req.param("id");

  const [tag] = await db
    .select()
    .from(schema.tags)
    .where(and(eq(schema.tags.id, tagId), eq(schema.tags.userId, user.id)))
    .limit(1);

  if (!tag) {
    return c.json({ error: "Tag not found" }, 404);
  }

  await db.delete(schema.tags).where(eq(schema.tags.id, tagId));

  return c.json({ ok: true });
});

export default tags;
