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

// Validates a requested parent category: must exist, can't be the category
// itself, and must be top-level (one level of nesting only). Returns the id
// to store, null for "no parent", or an error message.
// (undefined = "not provided, leave as is").
export async function resolveBlogParent(
  raw: unknown,
  selfId?: string
): Promise<{ parentId: string | null | undefined } | { error: string }> {
  if (raw === undefined) return { parentId: undefined };
  if (raw === null || raw === "") return { parentId: null };
  if (typeof raw !== "string" || raw === selfId) return { error: "A category can't be its own parent." };
  const parent = await db.blogCategory.findUnique({ where: { id: raw }, select: { id: true, parentId: true } });
  if (!parent) return { error: "Parent category not found." };
  if (parent.parentId) return { error: "Subcategories can't have their own subcategories." };
  if (selfId && (await db.blogCategory.count({ where: { parentId: selfId } }))) {
    return { error: "This category has subcategories, so it can't become one." };
  }
  return { parentId: parent.id };
}

// Prisma filter for "articles in this category or any of its subcategories".
export function inBlogCategory(slug: string) {
  return { OR: [{ slug }, { parent: { slug } }] };
}

// State flags (the state-law posts' images) are shown whole on a light
// background; photos fill the frame.
export function heroFit(url: string | null | undefined) {
  return url && url.includes("/flags/") ? "object-contain bg-gray-50 p-3" : "object-cover";
}
