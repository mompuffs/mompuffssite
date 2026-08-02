// POD providers (Printify in particular) return product descriptions as
// HTML. We store/display descriptions as plain text, so strip markup down
// to readable text with paragraph/line breaks preserved.
export function stripHtml(html?: string | null): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
