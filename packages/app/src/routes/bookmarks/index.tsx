import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { BookmarkRow } from "../../components/BookmarkRow";
import type { Bookmark, Tag } from "@ruminate/shared";

type BookmarkSearch = {
  tag?: string;
  q?: string;
};

export const Route = createFileRoute("/bookmarks/")({
  component: BookmarksPage,
  validateSearch: (search: Record<string, unknown>): BookmarkSearch => ({
    tag: (search.tag as string) || undefined,
    q: (search.q as string) || undefined,
  }),
});

function BookmarksPage() {
  const { tag, q } = useSearch({ from: "/bookmarks/" });
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick add form
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    loadData();
  }, [tag, q]);

  async function loadData() {
    setLoading(true);
    try {
      const [bookmarkRes, tagRes] = await Promise.all([
        api.bookmarks.list({ tag, q }),
        api.tags.list(),
      ]);
      setBookmarks(bookmarkRes.items);
      setTags(tagRes.items);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;
    try {
      await api.bookmarks.create({
        url: newUrl.trim(),
        title: newTitle.trim() || undefined,
        tags: newTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: newNotes.trim() || undefined,
      });
      setNewUrl("");
      setNewTitle("");
      setNewTags("");
      setNewNotes("");
      setShowAdd(false);
      loadData();
    } catch (err) {
      console.error("Failed to add bookmark:", err);
    }
  }

  async function handleDelete(id: string) {
    await api.bookmarks.delete(id);
    loadData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold">
          bookmarks
          {tag && <span className="font-normal text-muted"> / {tag}</span>}
        </h2>
        <button onClick={() => setShowAdd(!showAdd)} className="btn">
          {showAdd ? "cancel" : "+ add"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="border border-border p-3 mb-4 text-xs space-y-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="url"
            className="w-full border border-border px-2 py-1 font-mono"
            required
          />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="title (optional — auto-fetched from page)"
            className="w-full border border-border px-2 py-1 font-mono"
          />
          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="tags (comma separated)"
            className="w-full border border-border px-2 py-1 font-mono"
          />
          <textarea
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="notes"
            className="w-full border border-border px-2 py-1 font-mono"
            rows={2}
          />
          <button type="submit" className="btn">
            save
          </button>
        </form>
      )}

      {/* Tag filter */}
      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {tags.map((t) => (
            <a
              key={t.id}
              href={`/bookmarks?tag=${encodeURIComponent(t.name)}`}
              className={`tag ${t.name === tag ? "border-accent text-accent" : ""}`}
            >
              {t.name} ({t.count})
            </a>
          ))}
          {tag && (
            <a href="/bookmarks" className="tag">
              clear
            </a>
          )}
        </div>
      )}

      {/* Bookmark list */}
      {loading ? (
        <p className="text-muted text-xs">loading…</p>
      ) : bookmarks.length === 0 ? (
        <p className="text-muted text-xs">no bookmarks yet.</p>
      ) : (
        <div>
          {bookmarks.map((bookmark) => (
            <BookmarkRow
              key={bookmark.id}
              bookmark={bookmark}
              onDelete={() => handleDelete(bookmark.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
