// ============================================================
// Ruminate — Shared Types
// ============================================================

// --- Users ---

export interface User {
  id: string;
  cfAccessId: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Feeds ---

export interface Feed {
  id: string;
  userId: string;
  url: string;
  title: string;
  siteUrl: string | null;
  description: string | null;
  lastFetchedAt: string | null;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedRequest {
  url: string;
  title?: string;
}

export interface UpdateFeedRequest {
  title?: string;
}

// --- Entries ---

export interface Entry {
  id: string;
  feedId: string;
  userId: string;
  guid: string;
  url: string;
  title: string;
  author: string | null;
  contentSnippet: string | null;
  publishedAt: string | null;
  isRead: boolean;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateEntryRequest {
  isRead?: boolean;
  isStarred?: boolean;
}

export interface MarkEntriesReadRequest {
  feedId?: string;
  entryIds?: string[];
  all?: boolean;
}

// --- Bookmarks ---

export interface Bookmark {
  id: string;
  userId: string;
  entryId: string | null;
  url: string;
  title: string;
  description: string | null;
  notes: string | null;
  isArchived: boolean;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookmarkRequest {
  url: string;
  title?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  entryId?: string;
}

export interface UpdateBookmarkRequest {
  title?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  isArchived?: boolean;
  isPublic?: boolean;
}

// --- Tags ---

export interface Tag {
  id: string;
  userId: string;
  name: string;
  count: number;
  createdAt: string;
}

// --- API Responses ---

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface RefreshStatus {
  refreshing: boolean;
  feedCount: number;
}

// --- Search ---

export interface SearchRequest {
  query: string;
  type?: "entries" | "bookmarks" | "all";
}

export interface SearchResult {
  type: "entry" | "bookmark";
  id: string;
  title: string;
  url: string;
  feedTitle?: string;
  tags?: string[];
  createdAt: string;
}

// --- Import/Export ---

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}
