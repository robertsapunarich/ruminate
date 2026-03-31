import { stripHtml } from "../lib/utils";

// ============================================================
// OPML Import / Export
// ============================================================

export interface OpmlFeed {
  title: string;
  xmlUrl: string;
  htmlUrl: string | null;
  description: string | null;
  category: string | null;
}

// --- Import ---

/**
 * Parse an OPML file into a list of feed entries.
 * Handles OPML 1.0, 1.1, and 2.0 formats.
 * Supports nested outlines (folders/categories).
 */
export function parseOpml(xml: string): OpmlFeed[] {
  const feeds: OpmlFeed[] = [];

  // Extract all <outline> elements that have an xmlUrl (i.e. actual feeds, not folders)
  const outlineRegex = /<outline[^>]*xmlUrl=["'][^"']*["'][^>]*\/?>/gi;
  const outlines = xml.match(outlineRegex) ?? [];

  for (const outline of outlines) {
    const xmlUrl = extractAttr(outline, "xmlUrl");
    if (!xmlUrl) continue;

    const title =
      extractAttr(outline, "title") ??
      extractAttr(outline, "text") ??
      xmlUrl;

    const htmlUrl = extractAttr(outline, "htmlUrl");
    const description = extractAttr(outline, "description");
    const category = extractAttr(outline, "category");

    feeds.push({
      title: stripHtml(title),
      xmlUrl,
      htmlUrl: htmlUrl ?? null,
      description: description ? stripHtml(description) : null,
      category: category ?? null,
    });
  }

  // Deduplicate by xmlUrl
  const seen = new Set<string>();
  return feeds.filter((feed) => {
    const normalized = feed.xmlUrl.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

// --- Export ---

/**
 * Generate an OPML 2.0 document from a list of feeds.
 */
export function generateOpml(
  feeds: Array<{
    title: string;
    url: string;
    siteUrl: string | null;
    description: string | null;
  }>,
  ownerName?: string,
): string {
  const now = new Date().toUTCString();

  const outlines = feeds
    .map((feed) => {
      const attrs = [
        `text="${escapeXml(feed.title)}"`,
        `title="${escapeXml(feed.title)}"`,
        `type="rss"`,
        `xmlUrl="${escapeXml(feed.url)}"`,
      ];

      if (feed.siteUrl) {
        attrs.push(`htmlUrl="${escapeXml(feed.siteUrl)}"`);
      }
      if (feed.description) {
        attrs.push(`description="${escapeXml(feed.description)}"`);
      }

      return `      <outline ${attrs.join(" ")} />`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Ruminate Subscriptions</title>
    <dateCreated>${now}</dateCreated>${ownerName ? `\n    <ownerName>${escapeXml(ownerName)}</ownerName>` : ""}
  </head>
  <body>
    <outline text="Subscriptions" title="Subscriptions">
${outlines}
    </outline>
  </body>
</opml>`;
}

// --- Helpers ---

function extractAttr(tag: string, attr: string): string | null {
  const regex = new RegExp(`${attr}=["']([^"']*?)["']`, "i");
  const match = tag.match(regex);
  return match ? match[1] : null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
