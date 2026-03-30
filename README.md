# ruminate

A self-hosted RSS reader and bookmark manager built on Cloudflare Workers. Consolidate what you read, view, and listen to online in one place.

Inspired by Feedbin, Pinboard, and MyMind — without the subscription fees.

## Features

**RSS Reader**
- Subscribe to feeds by URL — auto-discovers RSS/Atom feeds from any website
- Background feed fetching with conditional GET (ETag / If-Modified-Since)
- Read/unread tracking, starring, per-feed filtering
- Handles micro-posts without titles (micro.blog, mastodon, tumblr-style)

**Bookmarking**
- Save any URL — page title is fetched automatically
- Tags, notes, and descriptions on every bookmark
- Filter by tag, search by title, archive
- Promote RSS entries to permanent bookmarks

**Design**
- Brutalist, Pinboard-inspired aesthetic — dense, fast, no nonsense
- Monospace type, minimal color palette, keyboard-friendly

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | [Hono](https://hono.dev) on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) via [Drizzle ORM](https://orm.drizzle.team) |
| Frontend | React 19, [TanStack Router](https://tanstack.com/router), Tailwind CSS |
| Auth | Cloudflare Access (zero-trust) |
| Cache | Cloudflare KV |
| Deployment | Single Worker serving API + SPA via Workers Assets |

## Project Structure

```
ruminate/
├── packages/
│   ├── api/          # Cloudflare Worker — Hono API + D1 + feed services
│   ├── app/          # React SPA — Vite + TanStack Router + Tailwind
│   └── shared/       # Shared TypeScript types
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 20
- [pnpm](https://pnpm.io) >= 9
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/ruminate.git
cd ruminate

# Install dependencies
pnpm install

# Create the D1 database
pnpm --filter @ruminate/api exec wrangler d1 create ruminate
```

After creating the database, copy the `database_id` from the output and update `packages/api/wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "ruminate",
    "database_id": "<paste-your-database-id-here>"
  }
]
```

Then run the migration:

```bash
pnpm db:migrate:local
```

### Development

```bash
# Start the API server (port 8787)
pnpm dev

# In another terminal, start the frontend dev server (port 5173)
pnpm dev:app
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` and `/auth` requests to the Worker.

### Deploy

```bash
# Deploy to Cloudflare
pnpm deploy
```

This builds the frontend and deploys everything as a single Cloudflare Worker with static assets.

## Authentication

Ruminate uses [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) for authentication. Set up an Access application for your domain to protect the Worker.

In local development, auth is bypassed with a dev user fallback.

The auth layer is designed to be extended — OAuth providers and magic link login can be added without changing the data model.

## API

All routes require authentication via Cloudflare Access headers.

### Feeds

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/feeds` | List all feeds |
| `POST` | `/api/feeds` | Subscribe to a feed (accepts website or feed URL) |
| `GET` | `/api/feeds/:id` | Get a feed |
| `PUT` | `/api/feeds/:id` | Update feed title |
| `DELETE` | `/api/feeds/:id` | Unsubscribe |
| `POST` | `/api/feeds/:id/refresh` | Refresh a single feed |
| `POST` | `/api/feeds/refresh` | Refresh all feeds (background) |

### Entries

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/entries` | List entries (filter: `feedId`, `unread`, `starred`) |
| `GET` | `/api/entries/:id` | Get an entry |
| `PUT` | `/api/entries/:id` | Update read/starred status |
| `PUT` | `/api/entries/mark-read` | Bulk mark as read (all, by feed, or by IDs) |

### Bookmarks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bookmarks` | List bookmarks (filter: `tag`, `archived`, `q`) |
| `POST` | `/api/bookmarks` | Create bookmark (title auto-fetched if omitted) |
| `GET` | `/api/bookmarks/:id` | Get a bookmark |
| `PUT` | `/api/bookmarks/:id` | Update bookmark |
| `DELETE` | `/api/bookmarks/:id` | Delete bookmark |

### Tags

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tags` | List tags with bookmark counts |
| `PUT` | `/api/tags/:id` | Rename a tag |
| `DELETE` | `/api/tags/:id` | Delete a tag |

### Search

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/search` | Search titles (`q`, `type`: entries/bookmarks/all) |

## Database Schema

Seven tables managed by Drizzle ORM with migrations:

- **users** — Cloudflare Access identity mapping
- **feeds** — RSS/Atom subscriptions with conditional GET metadata
- **entries** — Individual feed items (articles, posts)
- **bookmarks** — Saved URLs with notes, independent of feeds
- **tags** — User-defined labels
- **bookmark_tags** / **entry_tags** — Many-to-many join tables

Generate a new migration after schema changes:

```bash
pnpm db:generate
pnpm db:migrate:local    # Apply locally
pnpm db:migrate:remote   # Apply to production
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start the Worker dev server |
| `pnpm dev:app` | Start the Vite frontend dev server |
| `pnpm build` | Build the frontend for production |
| `pnpm deploy` | Build + deploy to Cloudflare |
| `pnpm db:generate` | Generate Drizzle migration from schema changes |
| `pnpm db:migrate:local` | Apply migrations to local D1 |
| `pnpm db:migrate:remote` | Apply migrations to production D1 |
| `pnpm typecheck` | Typecheck all packages |

## Roadmap

- [ ] OPML import/export
- [ ] Bookmark import (Pinboard JSON, Netscape HTML)
- [ ] Keyboard shortcuts (j/k navigation, s to star, b to bookmark)
- [ ] KV caching layer for feed data
- [ ] OAuth provider support (GitHub, Google)
- [ ] Magic link login
- [ ] Cron-based feed fetching
- [ ] Public bookmark sharing
- [ ] API tokens for third-party integrations

## License

MIT
