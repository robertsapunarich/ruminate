import type { Entry } from "@ruminate/shared";

interface EntryRowProps {
  entry: Entry;
  feedTitle?: string;
  onToggleRead: () => void;
  onToggleStar: () => void;
}

export function EntryRow({
  entry,
  feedTitle,
  onToggleRead,
  onToggleStar,
}: EntryRowProps) {
  const date = entry.publishedAt
    ? new Date(entry.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  // Use content snippet as fallback for title-less micro-posts
  const displayTitle =
    entry.title && entry.title !== "Untitled"
      ? entry.title
      : entry.contentSnippet ?? "Untitled";

  // Title-less posts use the snippet, which may be longer — show it differently
  const isMicroPost = !entry.title || entry.title === "Untitled";

  return (
    <div
      className={`entry-row flex items-start gap-2 text-xs ${entry.isRead ? "opacity-50" : ""}`}
    >
      {/* Star */}
      <button
        onClick={onToggleStar}
        className={`flex-shrink-0 mt-0.5 ${entry.isStarred ? "text-black" : "text-border hover:text-muted"}`}
        title={entry.isStarred ? "unstar" : "star"}
      >
        {entry.isStarred ? "★" : "☆"}
      </button>

      {/* Title / content + link */}
      <a
        href={entry.url}
        target="_blank"
        rel="noopener"
        className={`flex-1 ${isMicroPost ? "line-clamp-2" : "truncate"} ${entry.isRead ? "text-muted" : "text-black"}`}
        onClick={() => {
          if (!entry.isRead) onToggleRead();
        }}
      >
        {displayTitle}
      </a>

      {/* Feed name */}
      {feedTitle && (
        <span className="flex-shrink-0 text-muted hidden sm:inline whitespace-nowrap">
          {feedTitle}
        </span>
      )}

      {/* Date */}
      {date && (
        <span className="flex-shrink-0 text-muted w-12 text-right whitespace-nowrap">
          {date}
        </span>
      )}

      {/* Mark read/unread */}
      <button
        onClick={onToggleRead}
        className="flex-shrink-0 mt-0.5 text-muted hover:text-black"
        title={entry.isRead ? "mark unread" : "mark read"}
      >
        {entry.isRead ? "○" : "●"}
      </button>
    </div>
  );
}
