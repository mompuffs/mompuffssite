import { db } from "@/lib/db";

export function slugifyCategoryName(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueCategorySlug(shopId: string, baseSlug: string) {
  let slug = baseSlug;
  let n = 1;
  while (await db.category.findUnique({ where: { shopId_slug: { shopId, slug } } })) {
    n++;
    slug = `${baseSlug}-${n}`;
  }
  return slug;
}

// Finds an existing category by name (case-insensitive) under the given
// parent within a shop, creating it if it doesn't exist yet. Used by the
// CSV and URL-import flows, where category names arrive as free text rather
// than existing IDs from the picker.
export async function findOrCreateCategory(shopId: string, name: string, parentId: string | null) {
  const existing = await db.category.findFirst({
    where: { shopId, parentId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing;

  const slug = await uniqueCategorySlug(shopId, slugifyCategoryName(name));
  return db.category.create({
    data: { shopId, name, slug, parentId: parentId ?? undefined },
  });
}

// Resolves a free-text category spec into category IDs owned by the shop.
// Spec format: one or more categories separated by ";", each optionally
// nested one level with ">" (e.g. "Apparel > Men's Apparel; Collections").
// Extra segments beyond two are ignored. Caches lookups within a single
// import run so the same name isn't looked up/created twice.
export async function resolveCategorySpec(
  shopId: string,
  spec: string,
  cache: Map<string, string>
): Promise<string[]> {
  if (!spec || !spec.trim()) return [];

  const entries = spec
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const ids: string[] = [];
  for (const entry of entries) {
    const parts = entry
      .split(">")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);
    if (parts.length === 0) continue;

    let parentId: string | null = null;
    let categoryId: string | undefined;
    for (const name of parts) {
      const cacheKey = `${parentId ?? "root"}::${name.toLowerCase()}`;
      let id = cache.get(cacheKey);
      if (!id) {
        const category = await findOrCreateCategory(shopId, name, parentId);
        id = category.id;
        cache.set(cacheKey, id);
      }
      parentId = id;
      categoryId = id;
    }
    if (categoryId) ids.push(categoryId);
  }
  return Array.from(new Set(ids));
}
