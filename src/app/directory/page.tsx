import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DIRECTORY_CATEGORIES,
  DIRECTORY_PER_PAGE,
  US_STATES,
  categoryFor,
  formatPhone,
  fullAddress,
  listingShowsAll,
  stateName,
} from "@/lib/directory";
import { pageCount, parsePage } from "@/lib/pagination";
import { CATEGORY_PLURAL } from "@/lib/directory";
import { pageMeta } from "@/lib/seo";
import DirectoryMap from "@/components/DirectoryMap";
import DirectoryListingCard, { LISTING_CARD_SELECT } from "@/components/DirectoryListingCard";
import ProductPagination from "@/components/ProductPagination";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, itemList } from "@/lib/structuredData";
import { locationCategory, locationPath, stateSlug } from "@/lib/directory";

export const dynamic = "force-dynamic";

// Each state/category view gets its own title and canonical URL, so
// "dispensaries in Missouri" can rank on its own. Keyword searches are
// kept out of the index (endless near-duplicate pages).
export async function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; state?: string; page?: string };
}): Promise<Metadata> {
  const cat = categoryFor(searchParams.category);
  const state = US_STATES.find((s) => s.code === searchParams.state);
  const page = parsePage(searchParams.page);
  const locCat = cat ? locationCategory(cat.slug) : undefined;
  const what = cat ? CATEGORY_PLURAL[cat.slug] : "Dispensaries, Smoke Shops & MMJ Doctors";
  const where = state ? ` in ${state.name}` : " Near You";
  const qs = new URLSearchParams();
  if (state) qs.set("state", state.code);
  if (cat) qs.set("category", cat.slug);
  if (page > 1) qs.set("page", String(page));
  const path = `/directory${qs.toString() ? `?${qs}` : ""}`;
  return pageMeta({
    title: `${what}${where}${page > 1 ? ` (page ${page})` : ""} | MomPuffs Directory`,
    description: `Find ${cat ? CATEGORY_PLURAL[cat.slug].toLowerCase() : "dispensaries, smoke and vape shops, and MMJ doctors"}${
      state ? ` in ${state.name}` : " across the US"
    } on an interactive map, with addresses, phone numbers, websites and state license info.`,
    // The clean location pages are the official versions of these views.
    path: locCat && page === 1 ? `/${locCat.segment}${state ? `/${stateSlug(state.code)}` : ""}` : path,
    noindex: Boolean(searchParams.q),
  });
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; state?: string; page?: string };
}) {
  const q = searchParams.q?.trim() || undefined;
  const category = categoryFor(searchParams.category)?.slug;
  const state = US_STATES.some((s) => s.code === searchParams.state) ? searchParams.state : undefined;
  const page = parsePage(searchParams.page);

  const where: Prisma.BusinessListingWhereInput = {
    status: "APPROVED",
    ...(category ? { category } : {}),
    ...(state ? { state } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { zip: { startsWith: q } },
            { about: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, listings, counts] = await Promise.all([
    db.businessListing.count({ where }),
    db.businessListing.findMany({
      where,
      // Fuller (and owner-claimed) listings first; see listingCompleteness.
      orderBy: [{ completeness: "desc" }, { name: "asc" }],
      skip: (page - 1) * DIRECTORY_PER_PAGE,
      take: DIRECTORY_PER_PAGE,
      select: LISTING_CARD_SELECT,
    }),
    db.businessListing.groupBy({
      by: ["category"],
      where: { status: "APPROVED", ...(state ? { state } : {}) },
      _count: { _all: true },
    }),
  ]);

  const countFor = (slug: string) => counts.find((c) => c.category === slug)?._count._all ?? 0;
  const allCount = counts.reduce((n, c) => n + c._count._all, 0);
  const pages = pageCount(total, DIRECTORY_PER_PAGE);
  const filtered = Boolean(q || category || state);

  function chipHref(slug?: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (state) p.set("state", state);
    if (slug) p.set("category", slug);
    const s = p.toString();
    return s ? `/directory?${s}` : "/directory";
  }

  const catInfo = categoryFor(category);
  return (
    <div>
      <JsonLd
        items={[
          itemList(
            `${catInfo ? CATEGORY_PLURAL[catInfo.slug] : "Businesses"}${state ? ` in ${stateName(state)}` : ""}`,
            listings.map((l) => `/directory/${l.slug}`)
          ),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Directory", path: "/directory" },
            ...(state ? [{ name: stateName(state), path: `/directory?state=${state}` }] : []),
            ...(catInfo ? [{ name: catInfo.name }] : []),
          ]),
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Business Directory</h1>
          <p className="text-sm text-gray-500">Dispensaries, smoke shops, MMJ doctors and more, submitted by the community.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/directory/mine" className="text-sm font-semibold text-brand-700 px-3 py-2 rounded-full hover:bg-brand-50">
            My listings
          </Link>
          <Link href="/directory/submit" className="text-sm font-semibold bg-brand-600 text-white px-4 py-2 rounded-full hover:bg-brand-700">
            + Submit a business
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        <Link
          href={chipHref()}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border ${
            !category ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700 hover:bg-brand-50"
          }`}
        >
          All <span className="opacity-70 font-normal">({allCount})</span>
        </Link>
        {DIRECTORY_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={chipHref(c.slug)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border ${
              category === c.slug ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700 hover:bg-brand-50"
            }`}
          >
            {c.icon} {c.name} <span className="opacity-70 font-normal">({countFor(c.slug)})</span>
          </Link>
        ))}
      </div>

      <form method="get" action="/directory" className="flex flex-col sm:flex-row gap-2 mb-4">
        {category && <input type="hidden" name="category" value={category} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, city or ZIP"
          className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white"
        />
        <select name="state" defaultValue={state ?? ""} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All states</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
        <button className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700">Search</button>
      </form>

      <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-4 items-start">
        <div className="w-full min-w-0">
          <p className="text-sm text-gray-500 mb-2">
            {total} business{total === 1 ? "" : "es"}
            {state && <> in {stateName(state)}</>}
            {state && (
              <>
                {" "}·{" "}
                <Link href={locationPath(category ?? "dispensaries", state)} className="text-brand-600 hover:underline">
                  browse {stateName(state)} by city
                </Link>
              </>
            )}
            {filtered && (
              <>
                {" "}·{" "}
                <Link href="/directory" className="text-brand-600 hover:underline">clear filters</Link>
              </>
            )}
          </p>

          {listings.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-gray-500 text-sm">
              {filtered ? "No businesses match those filters yet." : "No businesses listed yet."}{" "}
              <Link href="/directory/submit" className="text-brand-600 hover:underline">Submit one</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((l) => (
                <DirectoryListingCard key={l.id} l={l} />
              ))}
            </div>
          )}

          <ProductPagination
            page={Math.min(page, pages)}
            pageCount={pages}
            basePath="/directory"
            query={{ q, category, state }}
          />
        </div>

        <div className="w-full lg:sticky lg:top-[166px]">
          <DirectoryMap
            mode="us"
            pinsUrl={`/api/directory/pins?${new URLSearchParams({
              ...(category ? { category } : {}),
              ...(state ? { state } : {}),
              ...(q ? { q } : {}),
            })}`}
            fitToPoints={filtered}
            className="h-72 sm:h-96 lg:h-[calc(100vh-190px)] lg:min-h-[420px]"
          />
        </div>
      </div>
    </div>
  );
}
