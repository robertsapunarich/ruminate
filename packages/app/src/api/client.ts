import type {
  Feed,
  Entry,
  Bookmark,
  Tag,
  CreateFeedRequest,
  UpdateFeedRequest,
  UpdateEntryRequest,
  MarkEntriesReadRequest,
  CreateBookmarkRequest,
  UpdateBookmarkRequest,
  PaginatedResponse,
  RefreshStatus,
  SearchResult,
  ImportResult,
  User,
} from "@ruminate/shared";

const BASE = "";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      (body as { error?: string }).error ?? `HTTP ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

// --- Auth ---

export const api = {
  auth: {
    me: () => request<User>("/auth/me"),
  },

  // --- Feeds ---

  feeds: {
    list: () =>
      request<{ items: Feed[] }>("/api/feeds"),
    get: (id: string) => request<Feed>(`/api/feeds/${id}`),
    create: (data: CreateFeedRequest) =>
      request<Feed>("/api/feeds", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateFeedRequest) =>
      request<Feed>(`/api/feeds/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/feeds/${id}`, { method: "DELETE" }),
    refresh: (id: string) =>
      request<{ feedId: string; newEntries: number }>(`/api/feeds/${id}/refresh`, {
        method: "POST",
      }),
    refreshAll: () =>
      request<RefreshStatus>("/api/feeds/refresh", { method: "POST" }),
  },

  // --- Entries ---

  entries: {
    list: (params?: {
      feedId?: string;
      unread?: boolean;
      starred?: boolean;
      offset?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.feedId) searchParams.set("feedId", params.feedId);
      if (params?.unread) searchParams.set("unread", "true");
      if (params?.starred) searchParams.set("starred", "true");
      if (params?.offset) searchParams.set("offset", String(params.offset));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      const qs = searchParams.toString();
      return request<PaginatedResponse<Entry>>(
        `/api/entries${qs ? `?${qs}` : ""}`,
      );
    },
    get: (id: string) => request<Entry>(`/api/entries/${id}`),
    update: (id: string, data: UpdateEntryRequest) =>
      request<Entry>(`/api/entries/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    markRead: (data: MarkEntriesReadRequest) =>
      request<{ ok: boolean }>("/api/entries/mark-read", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  // --- Bookmarks ---

  bookmarks: {
    list: (params?: {
      tag?: string;
      archived?: boolean;
      q?: string;
      offset?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.tag) searchParams.set("tag", params.tag);
      if (params?.archived) searchParams.set("archived", "true");
      if (params?.q) searchParams.set("q", params.q);
      if (params?.offset) searchParams.set("offset", String(params.offset));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      const qs = searchParams.toString();
      return request<PaginatedResponse<Bookmark>>(
        `/api/bookmarks${qs ? `?${qs}` : ""}`,
      );
    },
    get: (id: string) => request<Bookmark>(`/api/bookmarks/${id}`),
    create: (data: CreateBookmarkRequest) =>
      request<Bookmark>("/api/bookmarks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateBookmarkRequest) =>
      request<Bookmark>(`/api/bookmarks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/bookmarks/${id}`, { method: "DELETE" }),
  },

  // --- Tags ---

  tags: {
    list: () => request<{ items: Tag[] }>("/api/tags"),
    rename: (id: string, name: string) =>
      request<Tag>(`/api/tags/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/tags/${id}`, { method: "DELETE" }),
  },

  // --- Search ---

  search: {
    query: (q: string, type?: "entries" | "bookmarks" | "all") => {
      const searchParams = new URLSearchParams({ q });
      if (type) searchParams.set("type", type);
      return request<{ results: SearchResult[] }>(
        `/api/search?${searchParams}`,
      );
    },
  },

  // --- Import / Export ---

  importExport: {
    importOpml: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/opml", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      return res.json() as Promise<ImportResult>;
    },
    exportOpml: () => "/api/export/opml",
  },
};
