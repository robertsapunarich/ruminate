import { Hono } from "hono";
import { eq, and, desc, like } from "drizzle-orm";
import * as schema from "../db/schema";
import { generateId, parsePagination, stripHtml } from "../lib/utils";
import type { AppContext, Database } from "../lib/types";

const bookmarks = new Hono<AppContext>();

/**
 * GET /api/bookmarks — List bookmarks for the current user.
 * Query params:
 *   - tag: filter by tag name
 *   - archived: "true" to show archived
 *   - q: search title
 *   - offset/limit: pagination
 */
bookmarks.get("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const url = new URL(c.req.url);
  const { offset, limit } = parsePagination(url);

  const tagName = url.searchParams.get("tag");
  const archived = url.searchParams.get("archived");
  const search = url.searchParams.get("q");

  const conditions = [eq(schema.bookmarks.userId, user.id)];

  if (archived !== "true") {
    conditions.push(eq(schema.bookmarks.isArchived, false));
  }
  if (search) {
    conditions.push(like(schema.bookmarks.title, `%${search}%`));
  }

  let items;

  if (tagName) {
    // Join through bookmark_tags and tags to filter
    items = await db
      .select({ bookmark: schema.bookmarks })
      .from(schema.bookmarks)
      .innerJoin(
        schema.bookmarkTags,
        eq(schema.bookmarks.id, schema.bookmarkTags.bookmarkId),
      )
      .innerJoin(schema.tags, eq(schema.bookmarkTags.tagId, schema.tags.id))
      .where(and(...conditions, eq(schema.tags.name, tagName)))
      .orderBy(desc(schema.bookmarks.createdAt))
      .limit(limit)
      .offset(offset);

    // Unwrap the join
    const bookmarkItems = items.map((row) => row.bookmark);

    // Fetch tags for each bookmark
    const result = await attachTagsToBookmarks(db, bookmarkItems);
    return c.json({ items: result, offset, limit });
  }

  const rawItems = await db
    .select()
    .from(schema.bookmarks)
    .where(and(...conditions))
    .orderBy(desc(schema.bookmarks.createdAt))
    .limit(limit)
    .offset(offset);

  const result = await attachTagsToBookmarks(db, rawItems);
  return c.json({ items: result, offset, limit });
});

/**
 * POST /api/bookmarks — Create a new bookmark.
 * Title is optional — if not provided, fetches the page <title> tag.
 * Falls back to the URL's domain if fetching fails.
 */
bookmarks.post("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = await c.req.json<{
    url: string;
    title?: string;
    description?: string;
    notes?: string;
    tags?: string[];
    entryId?: string;
  }>();

  if (!body.url) {
    return c.json({ error: "url is required" }, 400);
  }

  // Resolve title: use provided title, or fetch from page, or fall back to domain
  const title = body.title?.trim() || (await fetchPageTitle(body.url));

  const bookmarkId = generateId();

  await db.insert(schema.bookmarks).values({
    id: bookmarkId,
    userId: user.id,
    entryId: body.entryId ?? null,
    url: body.url,
    title,
    description: body.description ?? null,
    notes: body.notes ?? null,
  });

  // Handle tags
  if (body.tags?.length) {
    await ensureAndLinkTags(db, user.id, bookmarkId, body.tags);
  }

  const [bookmark] = await db
    .select()
    .from(schema.bookmarks)
    .where(eq(schema.bookmarks.id, bookmarkId))
    .limit(1);

  const result = await attachTagsToBookmarks(db, [bookmark]);
  return c.json(result[0], 201);
});

/**
 * GET /api/bookmarks/:id — Get a single bookmark.
 */
bookmarks.get("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const [bookmark] = await db
    .select()
    .from(schema.bookmarks)
    .where(
      and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, user.id)),
    )
    .limit(1);

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  const result = await attachTagsToBookmarks(db, [bookmark]);
  return c.json(result[0]);
});

/**
 * PUT /api/bookmarks/:id — Update a bookmark.
 */
bookmarks.put("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json<{
    title?: string;
    description?: string;
    notes?: string;
    tags?: string[];
    isArchived?: boolean;
    isPublic?: boolean;
  }>();

  const [bookmark] = await db
    .select()
    .from(schema.bookmarks)
    .where(
      and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, user.id)),
    )
    .limit(1);

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.isArchived !== undefined) updates.isArchived = body.isArchived;
  if (body.isPublic !== undefined) updates.isPublic = body.isPublic;

  await db
    .update(schema.bookmarks)
    .set(updates)
    .where(eq(schema.bookmarks.id, id));

  // Update tags if provided
  if (body.tags !== undefined) {
    // Remove all existing tags
    await db
      .delete(schema.bookmarkTags)
      .where(eq(schema.bookmarkTags.bookmarkId, id));
    // Re-add
    if (body.tags.length) {
      await ensureAndLinkTags(db, user.id, id, body.tags);
    }
  }

  const [updated] = await db
    .select()
    .from(schema.bookmarks)
    .where(eq(schema.bookmarks.id, id))
    .limit(1);

  const result = await attachTagsToBookmarks(db, [updated]);
  return c.json(result[0]);
});

/**
 * DELETE /api/bookmarks/:id — Delete a bookmark.
 */
bookmarks.delete("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const [bookmark] = await db
    .select()
    .from(schema.bookmarks)
    .where(
      and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, user.id)),
    )
    .limit(1);

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  await db.delete(schema.bookmarks).where(eq(schema.bookmarks.id, id));

  return c.json({ ok: true });
});

// --- Helpers ---

/**
 * Ensure tags exist for the user, then link them to a bookmark.
 */
async function ensureAndLinkTags(
  db: Database,
  userId: string,
  bookmarkId: string,
  tagNames: string[],
) {
  for (const name of tagNames) {
    const normalized = name.toLowerCase().trim();
    if (!normalized) continue;

    // Get or create tag
    let [tag] = await db
      .select()
      .from(schema.tags)
      .where(
        and(eq(schema.tags.userId, userId), eq(schema.tags.name, normalized)),
      )
      .limit(1);

    if (!tag) {
      await db.insert(schema.tags).values({
        id: generateId(),
        userId,
        name: normalized,
      });
      [tag] = await db
        .select()
        .from(schema.tags)
        .where(
          and(
            eq(schema.tags.userId, userId),
            eq(schema.tags.name, normalized),
          ),
        )
        .limit(1);
    }

    // Link tag to bookmark (ignore if already linked)
    try {
      await db.insert(schema.bookmarkTags).values({
        bookmarkId,
        tagId: tag.id,
      });
    } catch {
      // Unique constraint — already linked, ignore
    }
  }
}

/**
 * Attach tag names to bookmark objects for API responses.
 */
async function attachTagsToBookmarks(
  db: Database,
  bookmarkList: (typeof schema.bookmarks.$inferSelect)[],
) {
  return Promise.all(
    bookmarkList.map(async (bookmark) => {
      const tagRows = await db
        .select({ name: schema.tags.name })
        .from(schema.bookmarkTags)
        .innerJoin(schema.tags, eq(schema.bookmarkTags.tagId, schema.tags.id))
        .where(eq(schema.bookmarkTags.bookmarkId, bookmark.id));

      return {
        ...bookmark,
        tags: tagRows.map((t) => t.name),
      };
    }),
  );
}

/**
 * Fetch a page and extract its <title> tag.
 * Falls back to the URL's domain if fetching or parsing fails.
 */
async function fetchPageTitle(url: string): Promise<string> {
  try {
    const parsedUrl = new URL(url);
    const fallback = parsedUrl.hostname.replace("www.", "");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Ruminate/1.0 (Bookmark; +https://github.com/ruminate)",
        Accept: "text/html, */*",
      },
      redirect: "follow",
    });

    if (!response.ok) return fallback;

    // Only read the first chunk — we just need the <title> from <head>,
    // no need to download the entire page body.
    const text = await response.text();
    const head = text.slice(0, 10_000);

    const match = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (match) {
      const title = stripHtml(match[1]).trim();
      if (title) return title;
    }

    return fallback;
  } catch {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  }
}

export default bookmarks;
