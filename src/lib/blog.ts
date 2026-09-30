import { marked } from "marked";
import { db } from "@/lib/db";

export const BLOG_PER_PAGE = 12;

export function blogSlugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uniqueBlogCategorySlug(base: string, exceptId?: string) {
  let slug = base || "category";
  let n = 1;
  for (;;) {
    const hit = await db.blogCategory.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
    n++;
    slug = `${base}-${n}`;
  }
}

// Article bodies are markdown (Socrates' format, and what the admin edits).
// Sources are Socrates or an admin, not visitors, so raw HTML in the
// markdown is trusted; script tags are still stripped as a belt-and-braces
// measure. External links open in a new tab and don't pass link equity,
// matching how Socrates renders citations.
export function renderMarkdown(md: string) {
  const html = marked.parse(md, { async: false, gfm: true }) as string;
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="nofollow noopener noreferrer"');
}

export type BlogSort = "newest" | "oldest";

export function parseSort(raw: string | undefined): BlogSort {
  return raw === "oldest" ? "oldest" : "newest";
}

export function asFaq(v: unknown): { q: string; a: string }[] {
  return Array.isArray(v) ? v.filter((x) => x && typeof x.q === "string" && typeof x.a === "string") : [];
}

export function asSources(v: unknown): { title: string; url: string }[] {
  return Array.isArray(v) ? v.filter((x) => x && typeof x.title === "string" && typeof x.url === "string") : [];
}
