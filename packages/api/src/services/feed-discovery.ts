/**
 * Feed discovery — given a URL (which may be an HTML page, not a feed),
 * find the actual RSS/Atom feed URL.
 *
 * Strategy:
 * 1. Fetch the URL.
 * 2. If the response Content-Type is already a feed type, return it as-is.
 * 3. If it's HTML, parse <link rel="alternate"> tags to find feed URLs.
 * 4. If no <link> tags found, try common feed paths as a fallback.
 */

const FEED_CONTENT_TYPES = [
  "application/rss+xml",
  "application/atom+xml",
  "application/xml",
  "text/xml",
  "application/feed+json",
];

const COMMON_FEED_PATHS = [
  "/feed",
  "/feed.xml",
  "/rss",
  "/rss.xml",
  "/atom",
  "/atom.xml",
  "/index.xml",
  "/feed/atom",
  "/feed/rss",
  "/.rss",
  "/blog/feed",
  "/blog/rss",
  "/blog/feed.xml",
];

const USER_AGENT = "Ruminate/1.0 (RSS Reader; +https://github.com/ruminate)";

export interface DiscoveredFeed {
  feedUrl: string;
  title: string | null;
  type: string | null;
}

export interface DiscoveryResult {
  feedUrl: string;
  body: string;
  discoveredFrom: "direct" | "link-tag" | "well-known-path";
}

/**
 * Discover the feed URL for a given URL.
 * Returns the resolved feed URL and the fetched XML body, ready to parse.
 */
export async function discoverFeed(url: string): Promise<DiscoveryResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html, application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const body = await response.text();

  // If the response is already a feed, return it directly
  if (isFeedContentType(contentType) || looksLikeFeed(body)) {
    return { feedUrl: url, body, discoveredFrom: "direct" };
  }

  // It's HTML — look for <link rel="alternate"> feed references
  const linkFeeds = extractFeedLinks(body, url);

  if (linkFeeds.length > 0) {
    // Prefer RSS, then Atom, then whatever's first
    const preferred =
      linkFeeds.find((f) => f.type?.includes("rss")) ??
      linkFeeds.find((f) => f.type?.includes("atom")) ??
      linkFeeds[0];

    const feedResponse = await fetch(preferred.feedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      redirect: "follow",
    });

    if (feedResponse.ok) {
      const feedBody = await feedResponse.text();
      if (looksLikeFeed(feedBody)) {
        return {
          feedUrl: preferred.feedUrl,
          body: feedBody,
          discoveredFrom: "link-tag",
        };
      }
    }
  }

  // Fallback: try common feed paths
  const baseUrl = new URL(url);
  for (const path of COMMON_FEED_PATHS) {
    const candidateUrl = `${baseUrl.origin}${path}`;
    try {
      const feedResponse = await fetch(candidateUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
        redirect: "follow",
      });

      if (feedResponse.ok) {
        const feedBody = await feedResponse.text();
        if (looksLikeFeed(feedBody)) {
          return {
            feedUrl: candidateUrl,
            body: feedBody,
            discoveredFrom: "well-known-path",
          };
        }
      }
    } catch {
      // Skip failed attempts silently
    }
  }

  throw new Error(
    "Could not find an RSS or Atom feed at this URL. Try providing the direct feed URL.",
  );
}

/**
 * Check if a Content-Type header indicates a feed.
 */
function isFeedContentType(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return FEED_CONTENT_TYPES.some((type) => lower.includes(type));
}

/**
 * Quick heuristic: does this body look like XML feed content?
 */
function looksLikeFeed(body: string): boolean {
  const trimmed = body.trimStart().slice(0, 500);
  return (
    trimmed.includes("<rss") ||
    trimmed.includes("<feed") ||
    trimmed.includes("<RDF") ||
    (trimmed.includes("<?xml") &&
      (trimmed.includes("<rss") ||
        trimmed.includes("<feed") ||
        trimmed.includes("<channel")))
  );
}

/**
 * Extract feed URLs from HTML <link rel="alternate"> tags.
 */
function extractFeedLinks(html: string, baseUrl: string): DiscoveredFeed[] {
  const feeds: DiscoveredFeed[] = [];

  // Match <link> tags with rel="alternate" and a feed type
  const linkRegex =
    /<link[^>]*rel=["']alternate["'][^>]*>/gi;
  const matches = html.match(linkRegex) ?? [];

  for (const tag of matches) {
    const type = extractAttr(tag, "type");

    // Only care about feed types
    if (
      !type ||
      (!type.includes("rss") &&
        !type.includes("atom") &&
        !type.includes("xml") &&
        !type.includes("feed+json"))
    ) {
      continue;
    }

    const href = extractAttr(tag, "href");
    if (!href) continue;

    const title = extractAttr(tag, "title");

    // Resolve relative URLs
    let feedUrl: string;
    try {
      feedUrl = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }

    feeds.push({ feedUrl, title, type });
  }

  // Also check for <link> where type comes before rel
  const linkRegex2 =
    /<link[^>]*type=["']application\/(rss|atom)\+xml["'][^>]*>/gi;
  const matches2 = html.match(linkRegex2) ?? [];

  for (const tag of matches2) {
    const href = extractAttr(tag, "href");
    if (!href) continue;

    // Skip if we already have this URL
    let feedUrl: string;
    try {
      feedUrl = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }

    if (feeds.some((f) => f.feedUrl === feedUrl)) continue;

    const title = extractAttr(tag, "title");
    const type = extractAttr(tag, "type");

    feeds.push({ feedUrl, title, type });
  }

  return feeds;
}

/**
 * Extract an attribute value from an HTML tag string.
 */
function extractAttr(tag: string, attr: string): string | null {
  const regex = new RegExp(`${attr}=["']([^"']*?)["']`, "i");
  const match = tag.match(regex);
  return match ? match[1] : null;
}
