const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  deg: "°",
  sup2: "²",
  sup3: "³",
  Prime: "″",
  prime: "′",
};

// POD providers (Printify in particular) return product descriptions as
// HTML. We store/display descriptions as plain text, so strip markup down
// to readable text with paragraph/line breaks preserved.
export function stripHtml(html?: string | null): string | undefined {
  if (!html) return undefined;
  return html
    // Printify often appends a size-chart <table> to the description; it has
    // no meaningful plain-text form (cells collapse into a jumbled number
    // list), so drop the whole table rather than trying to preserve it.
    .replace(/<table[\s\S]*?<\/table>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z0-9]+);/g, (match, name) => NAMED_ENTITIES[name] ?? match)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
