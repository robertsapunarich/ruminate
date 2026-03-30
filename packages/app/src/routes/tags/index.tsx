import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "../../api/client";
import type { Tag } from "@ruminate/shared";

export const Route = createFileRoute("/tags/")({
  component: TagsPage,
});

function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    setLoading(true);
    try {
      const res = await api.tags.list();
      setTags(res.items);
    } catch (err) {
      console.error("Failed to load tags:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(tag: Tag) {
    if (!confirm(`Delete tag "${tag.name}"? It will be removed from all bookmarks.`)) {
      return;
    }
    await api.tags.delete(tag.id);
    loadTags();
  }

  return (
    <div>
      <h2 className="text-sm font-bold mb-3">tags</h2>

      {loading ? (
        <p className="text-muted text-xs">loading…</p>
      ) : tags.length === 0 ? (
        <p className="text-muted text-xs">no tags yet. add some to your bookmarks.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-1 font-normal">tag</th>
              <th className="py-1 font-normal">bookmarks</th>
              <th className="py-1 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} className="border-b border-border">
                <td className="py-1.5">
                  <a href={`/bookmarks?tag=${encodeURIComponent(tag.name)}`}>
                    {tag.name}
                  </a>
                </td>
                <td className="py-1.5 text-muted">{tag.count}</td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => handleDelete(tag)}
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
