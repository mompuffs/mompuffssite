import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { DIRECTORY_CATEGORIES } from "@/lib/directory";
import { VISITOR_HELP_TOPICS } from "@/lib/visitorHelp";

// Rebuilt at most hourly, so new listings, products and posts show up
// without a deploy. (Without a revalidate this would be generated once at
// build time and go stale forever -- see the force-dynamic note in README.)
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, shops, products, listings, states] = await Promise.all([
    db.blogArticle.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.shop.findMany({ where: { products: { some: { archivedAt: null } } }, select: { slug: true } }),
    db.product.findMany({ where: { archivedAt: null }, select: { id: true, createdAt: true } }),
    // Same rule as the listing page's noindex: bare name-and-state listings
    // stay out until someone fills them in.
    db.businessListing.findMany({
      where: {
        status: "APPROVED",
        OR: [
          { licenseNumber: { not: null } },
          { claimedById: { not: null } },
          { fullAccess: true },
          { street: { not: null } },
          { website: { not: null } },
        ],
      },
      select: { slug: true, updatedAt: true },
    }),
    db.businessListing.groupBy({ by: ["state", "category"], where: { status: "APPROVED" }, _count: { _all: true } }),
  ]);

  const url = (path: string) => `${SITE_URL}${path}`;
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: url("/directory"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: url("/marketplace"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: url("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: url("/directory/submit"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/help"), changeFrequency: "monthly", priority: 0.4 },
    ...VISITOR_HELP_TOPICS.map((t) => ({ url: url(`/help/${t.slug}`), changeFrequency: "monthly" as const, priority: 0.3 })),
    { url: url("/contact"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  // State and state+category views of the directory (e.g. dispensaries in MO).
  const stateViews = new Map<string, number>();
  for (const s of states) stateViews.set(s.state, (stateViews.get(s.state) ?? 0) + s._count._all);
  const directoryViews: MetadataRoute.Sitemap = [
    ...DIRECTORY_CATEGORIES.map((c) => ({ url: url(`/directory?category=${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...Array.from(stateViews.keys()).map((st) => ({ url: url(`/directory?state=${st}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...states
      .filter((s) => s._count._all >= 3)
      // "&" must be pre-escaped: Next writes <loc> values into the XML verbatim.
      .map((s) => ({ url: url(`/directory?state=${s.state}&amp;category=${s.category}`), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];

  return [
    ...fixed,
    ...directoryViews,
    ...articles.map((a) => ({ url: url(`/blog/${a.slug}`), lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...shops.map((s) => ({ url: url(`/shop/${s.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: url(`/product/${p.id}`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...listings.map((l) => ({ url: url(`/directory/${l.slug}`), lastModified: l.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
