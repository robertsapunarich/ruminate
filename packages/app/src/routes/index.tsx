import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { EntryRow } from "../components/EntryRow";
import type { Entry, Feed } from "@ruminate/shared";

export const Route = createFileRoute("/")({
  component: EntriesPage,
});

function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<{
    feedId?: string;
    unread?: boolean;
    starred?: boolean;
  }>({ unread: true });
  const feedDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);
    try {
      const [entryRes, feedRes] = await Promise.all([
        api.entries.list(filter),
        api.feeds.list(),
      ]);
      setEntries(entryRes.items);
      setFeeds(feedRes.items);
    } catch (err) {
      console.error("Failed to load entries:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.feeds.refreshAll();
      // Wait a moment for background fetches, then reload
      setTimeout(() => {
        loadData();
        setRefreshing(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to refresh:", err);
      setRefreshing(false);
    }
  }

  async function handleMarkAllRead() {
    if (filter.feedId) {
      await api.entries.markRead({ feedId: filter.feedId });
    } else {
      await api.entries.markRead({ all: true });
    }
    loadData();
  }

  async function handleToggleRead(entry: Entry) {
    await api.entries.update(entry.id, { isRead: !entry.isRead });
    loadData();
  }

  async function handleToggleStar(entry: Entry) {
    await api.entries.update(entry.id, { isStarred: !entry.isStarred });
    loadData();
  }

  const feedMap = new Map(feeds.map((f) => [f.id, f]));

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-3 text-xs">
          <button
            onClick={() => setFilter({ unread: true })}
            className={
              filter.unread && !filter.starred ? "font-bold" : "text-muted"
            }
          >
            unread
          </button>
          <button
            onClick={() => setFilter({ starred: true })}
            className={filter.starred ? "font-bold" : "text-muted"}
          >
            starred
          </button>
          <button
            onClick={() => setFilter({})}
            className={
              !filter.unread && !filter.starred && !filter.feedId
                ? "font-bold"
                : "text-muted"
            }
          >
            all
          </button>
          {filter.feedId && (
            <>
              <span className="text-muted">|</span>
              <span className="text-xs">
                {feedMap.get(filter.feedId)?.title ?? "feed"}
              </span>
              <button
                onClick={() => setFilter({ unread: true })}
                className="text-muted text-xs"
              >
                ✕
              </button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="btn" disabled={refreshing}>
            {refreshing ? "refreshing…" : "refresh"}
          </button>
          <button onClick={handleMarkAllRead} className="btn">
            mark all read
          </button>
        </div>
      </div>

      {/* Feed sidebar (inline, Pinboard-style) */}
      {feeds.length > 0 && (
        <details ref={feedDetailsRef} className="mb-4 text-xs">
          <summary className="cursor-pointer text-muted">
            feeds ({feeds.length})
          </summary>
          <div className="mt-2 flex flex-col gap-1">
            {feeds.map((feed) => (
              <button
                key={feed.id}
                onClick={() => {
                  setFilter({ feedId: feed.id, unread: true });
                  if (feedDetailsRef.current) {
                    feedDetailsRef.current.open = false;
                  }
                }}
                className={`text-xs text-left ${filter.feedId === feed.id ? "font-bold text-black" : "text-muted hover:text-black"}`}
              >
                {feed.title}
              </button>
            ))}
          </div>
        </details>
      )}

      {/* Entry list */}
      {loading ? (
        <p className="text-muted text-xs">loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-muted text-xs">
          {feeds.length === 0
            ? "no feeds yet. add one in feeds →"
            : "no entries. try refreshing."}
        </p>
      ) : (
        <div>
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              feedTitle={feedMap.get(entry.feedId)?.title}
              onToggleRead={() => handleToggleRead(entry)}
              onToggleStar={() => handleToggleStar(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
