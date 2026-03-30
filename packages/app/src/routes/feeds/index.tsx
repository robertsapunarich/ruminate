import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "../../api/client";
import type { Feed } from "@ruminate/shared";

export const Route = createFileRoute("/feeds/")({
  component: FeedsPage,
});

function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeeds();
  }, []);

  async function loadFeeds() {
    setLoading(true);
    try {
      const res = await api.feeds.list();
      setFeeds(res.items);
    } catch (err) {
      console.error("Failed to load feeds:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api.feeds.create({ url: newUrl.trim() });
      setNewUrl("");
      loadFeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add feed");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(feed: Feed) {
    if (!confirm(`Unsubscribe from "${feed.title}"? All entries will be removed.`)) {
      return;
    }
    await api.feeds.delete(feed.id);
    loadFeeds();
  }

  return (
    <div>
      <h2 className="text-sm font-bold mb-3">feeds</h2>

      {/* Add feed */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://example.com/feed.xml"
          className="flex-1 border border-border px-2 py-1 text-xs font-mono"
        />
        <button type="submit" className="btn" disabled={adding}>
          {adding ? "adding…" : "add feed"}
        </button>
      </form>
      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

      {/* Feed list */}
      {loading ? (
        <p className="text-muted text-xs">loading…</p>
      ) : feeds.length === 0 ? (
        <p className="text-muted text-xs">no feeds yet.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-1 font-normal">title</th>
              <th className="py-1 font-normal">url</th>
              <th className="py-1 font-normal">last fetched</th>
              <th className="py-1 font-normal">errors</th>
              <th className="py-1 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((feed) => (
              <tr key={feed.id} className="border-b border-border">
                <td className="py-1.5">
                  {feed.siteUrl ? (
                    <a href={feed.siteUrl} target="_blank" rel="noopener">
                      {feed.title}
                    </a>
                  ) : (
                    feed.title
                  )}
                </td>
                <td className="py-1.5 text-muted max-w-[200px] truncate">
                  {feed.url}
                </td>
                <td className="py-1.5 text-muted">
                  {feed.lastFetchedAt
                    ? new Date(feed.lastFetchedAt).toLocaleDateString()
                    : "never"}
                </td>
                <td className="py-1.5">
                  {feed.errorCount > 0 ? (
                    <span className="text-red-600">{feed.errorCount}</span>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => handleDelete(feed)}
                    className="text-muted hover:text-red-600"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
