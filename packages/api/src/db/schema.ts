import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// --- Users ---

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  cfAccessId: text("cf_access_id").notNull().unique(),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- Feeds ---

export const feeds = sqliteTable(
  "feeds",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title").notNull(),
    siteUrl: text("site_url"),
    description: text("description"),
    lastFetchedAt: integer("last_fetched_at", { mode: "timestamp" }),
    etag: text("etag"),
    lastModified: text("last_modified"),
    errorCount: integer("error_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("feeds_user_id_idx").on(table.userId),
    uniqueIndex("feeds_user_url_idx").on(table.userId, table.url),
  ],
);

// --- Entries ---

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    guid: text("guid").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    contentSnippet: text("content_snippet"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    isStarred: integer("is_starred", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("entries_feed_id_idx").on(table.feedId),
    index("entries_user_id_idx").on(table.userId),
    index("entries_user_read_idx").on(table.userId, table.isRead),
    index("entries_published_idx").on(table.publishedAt),
    uniqueIndex("entries_feed_guid_idx").on(table.feedId, table.guid),
  ],
);

// --- Bookmarks ---

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: text("entry_id").references(() => entries.id, {
      onDelete: "set null",
    }),
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    notes: text("notes"),
    isArchived: integer("is_archived", { mode: "boolean" })
      .notNull()
      .default(false),
    isPublic: integer("is_public", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("bookmarks_user_id_idx").on(table.userId),
    index("bookmarks_user_archived_idx").on(table.userId, table.isArchived),
    index("bookmarks_url_idx").on(table.userId, table.url),
  ],
);

// --- Tags ---

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("tags_user_name_idx").on(table.userId, table.name)],
);

// --- Bookmark Tags (join table) ---

export const bookmarkTags = sqliteTable(
  "bookmark_tags",
  {
    bookmarkId: text("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("bookmark_tags_pk").on(table.bookmarkId, table.tagId),
    index("bookmark_tags_tag_idx").on(table.tagId),
  ],
);

// --- Entry Tags (join table) ---

export const entryTags = sqliteTable(
  "entry_tags",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("entry_tags_pk").on(table.entryId, table.tagId),
    index("entry_tags_tag_idx").on(table.tagId),
  ],
);
