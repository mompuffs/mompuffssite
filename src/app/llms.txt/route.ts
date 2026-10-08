import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { CATEGORY_PLURAL, DIRECTORY_CATEGORIES } from "@/lib/directory";

// /llms.txt (https://llmstxt.org): a plain-markdown guide to the site for AI
// assistants and AI search crawlers.
export const revalidate = 3600;

export async function GET() {
  const [counts, articles, states] = await Promise.all([
    db.businessListing.groupBy({ by: ["category"], where: { status: "APPROVED" }, _count: { _all: true } }),
    db.blogArticle.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 30,
      select: { slug: true, title: true, dek: true },
    }),
    db.businessListing.findMany({
      where: { status: "APPROVED", licenseNumber: { not: null } },
      distinct: ["state"],
      select: { state: true },
    }),
  ]);
  const count = (slug: string) => counts.find((c) => c.category === slug)?._count._all ?? 0;

  const body = `# Mompuffs

> Mompuffs (mompuffs.com) is a community (mainly) for women and moms who enjoy cannabis. It combines a nationwide directory of dispensaries, smoke and vape shops and medical marijuana doctors, a marketplace of member-run shops selling cannabis-themed goods, a blog of cannabis news, recipes and articles, and a members-only social community. "Mommy needs a joint should be just as acceptable as Mommy needs a glass of wine!"

Mompuffs does not sell cannabis. Directory listings come from business owners, members, OpenStreetMap, Overture Maps and official state licensing data. Listings marked "Licensed by the State of ..." were matched to that state's official licensed-dispensary list${
    states.length ? ` (currently: ${states.map((s) => s.state).join(", ")})` : ""
  }.

## Business directory

- [Directory home and map](${SITE_URL}/directory): search by name, city, ZIP or state
${DIRECTORY_CATEGORIES.map((c) => `- [${CATEGORY_PLURAL[c.slug]}](${SITE_URL}/directory?category=${c.slug}): ${count(c.slug).toLocaleString("en-US")} listing${count(c.slug) === 1 ? "" : "s"}`).join("\n")}
- Location pages by category, state and city: [Dispensaries by state](${SITE_URL}/dispensaries), [Smoke & vape shops by state](${SITE_URL}/smoke-shops), [Medical marijuana doctors by state](${SITE_URL}/mmj-doctors). Pattern: /dispensaries/<state>/<city>, e.g. [Dispensaries in Missouri](${SITE_URL}/dispensaries/missouri) and [Dispensaries in Springfield, MO](${SITE_URL}/dispensaries/missouri/springfield)
- Each business has its own page at /directory/<name-city-state> with address, phone, website, map and (when known) hours and license number
- [Add or claim a business](${SITE_URL}/directory/submit)

## Blog

${articles.map((a) => `- [${a.title}](${SITE_URL}/blog/${a.slug})${a.dek ? `: ${a.dek.replace(/\s+/g, " ").trim()}` : ""}`).join("\n")}

## Marketplace

- [Marketplace](${SITE_URL}/marketplace): cannabis-themed apparel, accessories, home goods and gifts from member shops
- [MomPuffs shop](${SITE_URL}/shop/mompuffs)

## About and help

- [Home](${SITE_URL}/)
- [About Mompuffs](${SITE_URL}/about)
- [Help & Support](${SITE_URL}/help)
- [Contact](${SITE_URL}/contact)
- [Privacy Policy](${SITE_URL}/privacy) and [Terms of Use](${SITE_URL}/terms)

## Optional

- The feed, groups, member profiles and messages are members-only and not crawlable.
`;

  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
