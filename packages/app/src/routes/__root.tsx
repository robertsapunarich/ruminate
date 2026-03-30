import { createRootRoute, Outlet, Link } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Header */}
      <header className="border-b border-black py-3 mb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-base font-bold tracking-tight">
            <Link to="/" className="text-black no-underline hover:no-underline">
              ruminate
            </Link>
          </h1>
          <nav className="flex gap-4">
            <Link to="/" className="nav-link" activeProps={{ className: "nav-link active" }}>
              entries
            </Link>
            <Link
              to="/bookmarks"
              className="nav-link"
              activeProps={{ className: "nav-link active" }}
            >
              bookmarks
            </Link>
            <Link
              to="/feeds"
              className="nav-link"
              activeProps={{ className: "nav-link active" }}
            >
              feeds
            </Link>
            <Link
              to="/tags"
              className="nav-link"
              activeProps={{ className: "nav-link active" }}
            >
              tags
            </Link>
            <Link
              to="/settings"
              className="nav-link"
              activeProps={{ className: "nav-link active" }}
            >
              settings
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-3 text-xs text-muted">
        ruminate — rss + bookmarks
      </footer>
    </div>
  );
}
