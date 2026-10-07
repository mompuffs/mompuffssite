import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DIRECTORY_CATEGORIES, DIRECTORY_PER_PAGE, US_STATES, categoryFor, formatPhone, stateName } from "@/lib/directory";
import { pageCount, parsePage } from "@/lib/pagination";
import DirectoryMap from "@/components/DirectoryMap";
import ProductPagination from "@/components/ProductPagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Directory | Mompuffs",
  description: "Find dispensaries, smoke shops, MMJ doctors and more near you.",
};

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

  const [total, listings, points, counts] = await Promise.all([
    db.businessListing.count({ where }),
    db.businessListing.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * DIRECTORY_PER_PAGE,
      take: DIRECTORY_PER_PAGE,
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        street: true,
        city: true,
        state: true,
        zip: true,
        phone: true,
        imageUrl: true,
        about: true,
        specials: true,
        menuUrl: true,
      },
    }),
    // Every match goes on the map, not just this page of the list.
    db.businessListing.findMany({
      where,
      take: 5000,
      select: { id: true, slug: true, name: true, category: true, lat: true, lng: true, city: true, state: true },
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Business Directory</h1>
          <p className="text-sm text-gray-500">Dispensaries, smoke shops, MMJ doctors and more, submitted by the community.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/directory/mine" className="text-sm font-semibold text-brand-700 px-3 py-2 rounded-full hover:bg-brand-50">
            My submissions
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
              {listings.map((l) => {
                const cat = categoryFor(l.category);
                return (
                  <Link
                    key={l.id}
                    href={`/directory/${l.slug}`}
                    className="group flex gap-3 bg-white rounded-xl shadow p-3 hover:shadow-md transition"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg overflow-hidden bg-brand-50 flex items-center justify-center text-3xl">
                      {l.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        cat?.icon
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        {cat && (
                          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: cat.color }}>
                            {cat.name}
                          </span>
                        )}
                        {l.specials && (
                          <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Deals</span>
                        )}
                        {l.menuUrl && (
                          <span className="text-[11px] font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded">Menu</span>
                        )}
                      </div>
                      <h2 className="font-bold leading-snug group-hover:text-brand-700 truncate">{l.name}</h2>
                      <p className="text-sm text-gray-500 truncate">
                        {l.street}, {l.city}, {l.state} {l.zip}
                      </p>
                      {l.phone && <p className="text-sm text-gray-500">{formatPhone(l.phone)}</p>}
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">{l.about}</p>
                    </div>
                  </Link>
                );
              })}
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
            points={points}
            fitToPoints={filtered}
            className="h-72 sm:h-96 lg:h-[calc(100vh-190px)] lg:min-h-[420px]"
          />
        </div>
      </div>
    </div>
  );
}
