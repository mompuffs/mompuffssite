import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { LOCATION_CATEGORIES, locationCategory, stateSlug } from "@/lib/directory";
import { VISITOR_HELP_TOPICS } from "@/lib/visitorHelp";

// Rebuilt at most hourly, so new listings, products and posts show up
// without a deploy. (Without a revalidate this would be generated once at
// build time and go stale forever -- see the force-dynamic note in README.)
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, shops, products, listings, stateCats, cityCats] = await Promise.all([
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
    db.businessListing.groupBy({
      by: ["state", "category", "citySlug"],
      where: { status: "APPROVED", citySlug: { not: null } },
      _count: { _all: true },
    }),
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
    { url: url("/about"), changeFrequency: "monthly", priority: 0.6 },
    { url: url("/contact"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  // Location pages: /dispensaries, /dispensaries/missouri,
  // /dispensaries/missouri/springfield (and smoke-shops, mmj-doctors).
  const states = new Set<string>();
  const directoryViews: MetadataRoute.Sitemap = [];
  for (const cat of LOCATION_CATEGORIES) {
    directoryViews.push({ url: url(`/${cat.segment}`), lastModified: now, changeFrequency: "weekly", priority: 0.8 });
  }
  for (const s of stateCats) {
    const cat = locationCategory(s.category);
    states.add(s.state);
    if (cat) directoryViews.push({ url: url(`/${cat.segment}/${stateSlug(s.state)}`), changeFrequency: "weekly", priority: 0.7 });
  }
  for (const c of cityCats) {
    const cat = locationCategory(c.category);
    if (cat && c.citySlug) {
      directoryViews.push({ url: url(`/${cat.segment}/${stateSlug(c.state)}/${c.citySlug}`), changeFrequency: "weekly", priority: 0.6 });
    }
  }
  for (const st of Array.from(states)) directoryViews.push({ url: url(`/directory?state=${st}`), changeFrequency: "weekly", priority: 0.5 });

  return [
    ...fixed,
    ...directoryViews,
    ...articles.map((a) => ({ url: url(`/blog/${a.slug}`), lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...shops.map((s) => ({ url: url(`/shop/${s.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: url(`/product/${p.id}`), lastModified: p.createdAt, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...listings.map((l) => ({ url: url(`/directory/${l.slug}`), lastModified: l.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
