import { stripHtml, truncate } from "../lib/utils";

export interface ParsedFeed {
  title: string;
  siteUrl: string | null;
  description: string | null;
  entries: ParsedEntry[];
}

export interface ParsedEntry {
  guid: string;
  url: string;
  title: string;
  author: string | null;
  contentSnippet: string | null;
  publishedAt: Date | null;
}

/**
 * Parse an RSS 2.0 or Atom feed from XML text.
 *
 * Uses regex-based parsing to avoid heavy DOM dependencies in Workers.
 * This is intentionally simple — handles the 90% case for RSS/Atom.
 */
export function parseFeed(xml: string): ParsedFeed {
  // Detect feed type
  if (xml.includes("<feed") && xml.includes("xmlns=\"http://www.w3.org/2005/Atom\"")) {
    return parseAtom(xml);
  }
  return parseRss(xml);
}

function parseRss(xml: string): ParsedFeed {
  const channelTitle = extractTag(xml, "title") ?? "Untitled Feed";
  const channelLink = extractTag(xml, "link");
  const channelDesc = extractTag(xml, "description");

  const items = extractAll(xml, "item");
  const entries: ParsedEntry[] = items.map((item) => {
    const rawTitle = extractTag(item, "title");
    const link = extractTag(item, "link") ?? "";
    const guid = extractTag(item, "guid") ?? link ?? rawTitle ?? "";
    const author =
      extractTag(item, "dc:creator") ?? extractTag(item, "author");
    const description = extractTag(item, "description");
    const content = extractTag(item, "content:encoded") ?? description;
    const pubDate = extractTag(item, "pubDate");

    const contentSnippet = content ? truncate(stripHtml(content)) : null;
    const title = deriveTitle(rawTitle, contentSnippet);

    return {
      guid,
      url: link,
      title,
      author: author ? stripHtml(author) : null,
      contentSnippet,
      publishedAt: pubDate ? parseDate(pubDate) : null,
    };
  });

  return {
    title: stripHtml(channelTitle),
    siteUrl: channelLink ?? null,
    description: channelDesc ? stripHtml(channelDesc) : null,
    entries,
  };
}

function parseAtom(xml: string): ParsedFeed {
  // For Atom, get the feed-level title before extracting entries
  const feedTitle = extractTag(xml, "title") ?? "Untitled Feed";

  // Feed-level link — look for rel="alternate" or first link
  const feedLink = extractAtomLink(xml, "alternate") ?? extractAtomLink(xml);
  const feedSubtitle = extractTag(xml, "subtitle");

  const items = extractAll(xml, "entry");
  const entries: ParsedEntry[] = items.map((item) => {
    const rawTitle = extractTag(item, "title");
    const link =
      extractAtomLink(item, "alternate") ?? extractAtomLink(item) ?? "";
    const id = extractTag(item, "id") ?? link ?? rawTitle ?? "";
    const authorName = extractTag(
      extractTag(item, "author") ?? "",
      "name",
    );
    const content =
      extractTag(item, "content") ?? extractTag(item, "summary");
    const updated =
      extractTag(item, "published") ?? extractTag(item, "updated");

    const contentSnippet = content ? truncate(stripHtml(content)) : null;
    const title = deriveTitle(rawTitle, contentSnippet);

    return {
      guid: id,
      url: link,
      title,
      author: authorName ? stripHtml(authorName) : null,
      contentSnippet,
      publishedAt: updated ? parseDate(updated) : null,
    };
  });

  return {
    title: stripHtml(feedTitle),
    siteUrl: feedLink ?? null,
    description: feedSubtitle ? stripHtml(feedSubtitle) : null,
    entries,
  };
}

// --- Title Derivation ---

/**
 * Derive a display title from a raw title and content snippet.
 * Many micro-posts (micro.blog, tumblr, mastodon-style) have no title.
 * In that case, use the first ~80 chars of the content as the title.
 */
function deriveTitle(
  rawTitle: string | null,
  contentSnippet: string | null,
): string {
  const cleaned = rawTitle ? stripHtml(rawTitle).trim() : "";

  // If there's a real title, use it
  if (cleaned && cleaned !== "Untitled") {
    return cleaned;
  }

  // Fall back to content snippet, truncated shorter for title display
  if (contentSnippet) {
    const snippet = contentSnippet.trim();
    if (snippet.length <= 80) return snippet;
    return snippet.slice(0, 80).trimEnd() + "…";
  }

  return "Untitled";
}

// --- XML Helpers (regex-based, lightweight for Workers) ---

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataRegex = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i",
  );
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular content
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAll(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi");
  return xml.match(regex) ?? [];
}

function extractAtomLink(
  xml: string,
  rel?: string,
): string | null {
  if (rel) {
    const regex = new RegExp(
      `<link[^>]*rel=["']${rel}["'][^>]*href=["']([^"']+)["']`,
      "i",
    );
    const match = xml.match(regex);
    if (match) return match[1];
  }
  const regex = /href=["']([^"']+)["']/i;
  const linkTag = xml.match(/<link[^>]*>/i);
  if (linkTag) {
    const match = linkTag[0].match(regex);
    if (match) return match[1];
  }
  return null;
}

function parseDate(dateStr: string): Date | null {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
