import type { Bookmark } from "@ruminate/shared";

interface BookmarkRowProps {
  bookmark: Bookmark;
  onDelete: () => void;
}

export function BookmarkRow({ bookmark, onDelete }: BookmarkRowProps) {
  const date = new Date(bookmark.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  })();

  return (
    <div className="bookmark-row text-xs">
      <div className="flex items-baseline gap-2">
        {/* Title */}
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener"
          className="text-black font-normal"
        >
          {bookmark.title}
        </a>

        {/* Domain */}
        <span className="text-muted">[{domain}]</span>

        {/* Date */}
        <span className="text-muted ml-auto flex-shrink-0">{date}</span>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="text-muted hover:text-red-600 flex-shrink-0"
          title="delete"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      {bookmark.description && (
        <p className="text-muted mt-0.5">{bookmark.description}</p>
      )}

      {/* Tags + notes */}
      <div className="flex items-center gap-2 mt-0.5">
        {bookmark.tags.length > 0 && (
          <span>
            {bookmark.tags.map((tag) => (
              <a
                key={tag}
                href={`/bookmarks?tag=${encodeURIComponent(tag)}`}
                className="tag"
              >
                {tag}
              </a>
            ))}
          </span>
        )}
        {bookmark.notes && (
          <span className="text-muted italic">— {bookmark.notes}</span>
        )}
      </div>
    </div>
  );
}
