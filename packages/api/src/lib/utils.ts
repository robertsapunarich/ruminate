/**
 * Generate a URL-safe unique ID using crypto.randomUUID()
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
export function truncate(text: string, maxLength: number = 300): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Strip HTML tags from a string, leaving plain text.
 *
 * Handles:
 * - Regular HTML tags (<p>, <br>, <img ...>, etc.)
 * - Double-encoded entities (&lt;p&gt; → <p> → stripped)
 * - CDATA sections
 * - Numeric and named HTML entities
 * - Inline image alt text preservation
 */
export function stripHtml(html: string): string {
  let text = html;

  // Strip CDATA wrappers
  text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  // Decode HTML entities first so double-encoded tags get caught
  text = decodeEntities(text);

  // Add space before block-level elements so words don't merge
  text = text.replace(/<(p|div|br|li|h[1-6]|blockquote|tr)[^>]*\/?>/gi, " ");

  // Preserve alt text from images
  text = text.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, " $1 ");

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Decode entities again (in case stripping tags revealed more)
  text = decodeEntities(text);

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Decode common HTML entities (named + numeric).
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#8216;/g, "\u2018") // '
    .replace(/&#8217;/g, "\u2019") // '
    .replace(/&#8220;/g, "\u201C") // "
    .replace(/&#8221;/g, "\u201D") // "
    .replace(/&#8211;/g, "\u2013") // –
    .replace(/&#8212;/g, "\u2014") // —
    .replace(/&#8230;/g, "\u2026") // …
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

/**
 * Parse a pagination query string into offset/limit.
 */
export function parsePagination(
  url: URL,
  defaultLimit: number = 50,
): { offset: number; limit: number } {
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? String(defaultLimit), 10) || defaultLimit));
  return { offset, limit };
}
