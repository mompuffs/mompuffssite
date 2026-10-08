import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LOCATION_CATEGORIES, type LocationCategory, stateSlug } from "@/lib/directory";
import { LOCATION_PAGE_SIZE, categoryForSegment, getCategoryStates, getCityPage, getStatePage } from "@/lib/directoryLocations";
import { pageCount, parsePage } from "@/lib/pagination";
import { pageMeta } from "@/lib/seo";
import { breadcrumbs, itemList } from "@/lib/structuredData";
import DirectoryListingCard from "@/components/DirectoryListingCard";
import DirectoryMap from "@/components/DirectoryMap";
import JsonLd from "@/components/JsonLd";
import ProductPagination from "@/components/ProductPagination";

// SEO landing pages for the directory, e.g. /dispensaries,
// /dispensaries/missouri, /dispensaries/missouri/springfield. Each route
// folder (dispensaries, smoke-shops, mmj-doctors) is a thin wrapper.

const lower = (s: string) => s.replace("Medical Marijuana", "medical marijuana").replace(/^([A-Z])/, (c) => c.toLowerCase()).replace("& Vape", "and vape").replace("Shops", "shops");
const n = (x: number) => x.toLocaleString("en-US");
const list = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")}${items.length > 2 ? "," : ""} and ${items[items.length - 1]}`;

function Crumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-2 flex flex-wrap gap-1">
      {items.map((it, i) => (
        <span key={i} className="flex gap-1">
          {i > 0 && <span aria-hidden>›</span>}
          {it.href ? (
            <Link href={it.href} className="text-brand-600 hover:underline">
              {it.name}
            </Link>
          ) : (
            <span>{it.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function OtherCategories({ current, stateSlugValue, citySlugValue, counts }: {
  current: LocationCategory;
  stateSlugValue?: string;
  citySlugValue?: string;
  counts?: Record<string, number>;
}) {
  const others = LOCATION_CATEGORIES.filter((c) => c.slug !== current.slug && (!counts || (counts[c.slug] ?? 0) > 0));
  if (!others.length) return null;
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <span className="text-gray-500">Also nearby:</span>
      {others.map((c) => (
        <Link
          key={c.slug}
          href={`/${c.segment}${stateSlugValue ? `/${stateSlugValue}` : ""}${citySlugValue ? `/${citySlugValue}` : ""}`}
          className="font-semibold text-brand-700 hover:underline"
        >
          {c.plural}
          {counts ? ` (${counts[c.slug]})` : ""}
        </Link>
      ))}
    </div>
  );
}

// ---------- /<segment> ----------

export async function hubMetadata(segment: string): Promise<Metadata> {
  const cat = categoryForSegment(segment);
  return pageMeta({
    title: `${cat.plural} Near You – Browse by State | MomPuffs`,
    description: `Find ${lower(cat.plural)} in every state on an interactive map, with addresses, phone numbers, websites, hours and state license info.`,
    path: `/${cat.segment}`,
  });
}

export async function CategoryHub({ segment }: { segment: string }) {
  const cat = categoryForSegment(segment);
  const states = await getCategoryStates(cat);
  const total = states.reduce((s, x) => s + x.count, 0);
  const licensed = states.reduce((s, x) => s + x.licensed, 0);
  return (
    <div className="space-y-5">
      <JsonLd
        items={[
          itemList(`${cat.plural} by state`, states.map((s) => `/${cat.segment}/${s.slug}`)),
          breadcrumbs([{ name: "Home", path: "/" }, { name: "Directory", path: "/directory" }, { name: cat.plural }]),
        ]}
      />
      <div>
        <Crumbs items={[{ name: "Home", href: "/" }, { name: "Directory", href: "/directory" }, { name: cat.plural }]} />
        <h1 className="text-2xl sm:text-3xl font-bold">{cat.plural} by State</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          MomPuffs lists {n(total)} {lower(cat.plural)} nationwide
          {licensed > 0 ? `, including ${n(licensed)} matched to official state license lists` : ""}. Pick a state to see every
          city, or explore the map.
        </p>
      </div>
      <DirectoryMap mode="us" pinsUrl={`/api/directory/pins?category=${cat.slug}`} className="h-72 sm:h-96" />
      <section className="bg-white rounded-xl shadow p-4 sm:p-5">
        <h2 className="font-bold text-lg mb-3">Choose a state</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {states.map((s) => (
            <Link key={s.code} href={`/${cat.segment}/${s.slug}`} className="rounded-lg px-3 py-2 hover:bg-brand-50 text-sm">
              <span className="font-semibold text-brand-800">{s.name}</span>{" "}
              <span className="text-gray-500">({n(s.count)})</span>
            </Link>
          ))}
        </div>
      </section>
      <OtherCategories current={cat} />
    </div>
  );
}

// ---------- /<segment>/<state> ----------

export async function stateMetadata(segment: string, state: string, pageRaw?: string): Promise<Metadata> {
  const cat = categoryForSegment(segment);
  const page = parsePage(pageRaw);
  const data = await getStatePage(cat, state, 1);
  if (!data) return { title: "Not found | MomPuffs", robots: { index: false } };
  const lic = data.licensed > 0 ? ` (${n(data.licensed)} State-Licensed)` : ` – ${n(data.total)} Listed`;
  const top = data.cities.slice(0, 3).map((c) => c.name);
  return pageMeta({
    title: `${cat.plural} in ${data.state.name}${lic}${page > 1 ? ` – Page ${page}` : ""} | MomPuffs`,
    description: `Find ${n(data.total)} ${lower(cat.plural)} in ${data.state.name}${top.length ? `, including ${list(top)}` : ""}. Addresses, phone numbers, websites and a map${
      data.licensed ? ", plus state license numbers" : ""
    }.`,
    path: `/${cat.segment}/${state}${page > 1 ? `?page=${page}` : ""}`,
  });
}

export async function StatePage({ segment, state, pageRaw }: { segment: string; state: string; pageRaw?: string }) {
  const cat = categoryForSegment(segment);
  const page = parsePage(pageRaw);
  const data = await getStatePage(cat, state, page);
  if (!data) notFound();
  const { state: st, total, licensed, cities, listings } = data;
  const pages = pageCount(total, LOCATION_PAGE_SIZE);
  const top = cities.slice(0, 3);
  const crumbs = [
    { name: "Home", href: "/" },
    { name: cat.plural, href: `/${cat.segment}` },
    { name: st.name },
  ];
  return (
    <div className="space-y-5">
      <JsonLd
        items={[
          itemList(`${cat.plural} in ${st.name}`, listings.map((l) => `/directory/${l.slug}`)),
          breadcrumbs(crumbs.map((c) => ({ name: c.name, path: c.href }))),
        ]}
      />
      <div>
        <Crumbs items={crumbs} />
        <h1 className="text-2xl sm:text-3xl font-bold">
          {cat.plural} in {st.name}
        </h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          MomPuffs lists {n(total)} {lower(cat.plural)} in {st.name}
          {cities.length ? ` across ${n(cities.length)} ${cities.length === 1 ? "city" : "cities"}` : ""}.{" "}
          {licensed > 0 &&
            (licensed === total
              ? `Every one is matched to ${st.name}'s official licensed-${cat.singular} list. `
              : `${n(licensed)} are matched to ${st.name}'s official license list. `)}
          {top.length > 0 &&
            `The most are in ${list(top.map((c) => `${c.name} (${c.count})`))}.`}
        </p>
      </div>

      {cities.length > 0 && (
        <section className="bg-white rounded-xl shadow p-4 sm:p-5">
          <h2 className="font-bold text-lg mb-3">
            {cat.plural} by city in {st.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link
                key={c.slug}
                href={`/${cat.segment}/${state}/${c.slug}`}
                className="text-sm bg-brand-50 hover:bg-brand-100 text-brand-800 font-semibold px-3 py-1.5 rounded-full"
              >
                {c.name} <span className="font-normal text-brand-600">({c.count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <DirectoryMap
        mode="us"
        pinsUrl={`/api/directory/pins?category=${cat.slug}&state=${st.code}`}
        fitToPoints
        className="h-72 sm:h-96"
      />

      <section>
        <h2 className="font-bold text-lg mb-3">
          All {lower(cat.plural)} in {st.name}
          {pages > 1 ? ` (page ${page} of ${pages})` : ""}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {listings.map((l) => (
            <DirectoryListingCard key={l.id} l={l} headingLevel="h3" />
          ))}
        </div>
        <ProductPagination page={Math.min(page, pages)} pageCount={pages} basePath={`/${cat.segment}/${state}`} />
      </section>

      <OtherCategories current={cat} stateSlugValue={state} />
    </div>
  );
}

// ---------- /<segment>/<state>/<city> ----------

export async function cityMetadata(segment: string, state: string, city: string): Promise<Metadata> {
  const cat = categoryForSegment(segment);
  const data = await getCityPage(cat, state, city);
  if (!data) return { title: "Not found | MomPuffs", robots: { index: false } };
  const count = data.listings.length;
  return pageMeta({
    title: `${cat.plural} in ${data.city.name}, ${data.state.code} – ${count} ${count === 1 ? "Listing" : "Listed"} | MomPuffs`,
    description: `${count} ${count === 1 ? cat.singular : lower(cat.plural)} in ${data.city.name}, ${data.state.name}: ${list(
      data.listings.slice(0, 3).map((l) => l.name)
    )}${count > 3 ? " and more" : ""}. Addresses, phone numbers, websites, hours and directions.`,
    path: `/${cat.segment}/${state}/${city}`,
  });
}

export async function CityPage({ segment, state, city }: { segment: string; state: string; city: string }) {
  const cat = categoryForSegment(segment);
  const data = await getCityPage(cat, state, city);
  if (!data) notFound();
  const { state: st, city: c, listings, licensed, otherCities } = data;
  const counts = Object.fromEntries(
    await Promise.all(
      LOCATION_CATEGORIES.map(async (x) => [
        x.slug,
        await db.businessListing.count({ where: { status: "APPROVED", category: x.slug, state: st.code, citySlug: city } }),
      ])
    )
  ) as Record<string, number>;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: cat.plural, href: `/${cat.segment}` },
    { name: st.name, href: `/${cat.segment}/${stateSlug(st.code)}` },
    { name: c.name },
  ];
  return (
    <div className="space-y-5">
      <JsonLd
        items={[
          itemList(`${cat.plural} in ${c.name}, ${st.code}`, listings.map((l) => `/directory/${l.slug}`)),
          breadcrumbs(crumbs.map((x) => ({ name: x.name, path: x.href }))),
        ]}
      />
      <div>
        <Crumbs items={crumbs} />
        <h1 className="text-2xl sm:text-3xl font-bold">
          {cat.plural} in {c.name}, {st.code}
        </h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          {listings.length === 1
            ? `There is 1 ${cat.singular} listed in ${c.name}, ${st.name}.`
            : `There are ${n(listings.length)} ${lower(cat.plural)} listed in ${c.name}, ${st.name}.`}{" "}
          {licensed > 0 &&
            (licensed === listings.length
              ? `${listings.length === 1 ? "It's" : "All are"} matched to the state's official license list. `
              : `${n(licensed)} ${licensed === 1 ? "is" : "are"} matched to the state's official license list. `)}
          Tap any listing for the address, phone number, website and directions.
        </p>
      </div>

      <DirectoryMap
        mode="us"
        pinsUrl={`/api/directory/pins?category=${cat.slug}&state=${st.code}&city=${city}`}
        fitToPoints
        className="h-72 sm:h-80"
      />

      <section>
        <h2 className="font-bold text-lg mb-3">
          {cat.plural} in {c.name}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {listings.map((l) => (
            <DirectoryListingCard key={l.id} l={l} headingLevel="h3" />
          ))}
        </div>
      </section>

      {otherCities.length > 0 && (
        <section className="bg-white rounded-xl shadow p-4 sm:p-5">
          <h2 className="font-bold text-lg mb-3">
            {cat.plural} in other {st.name} cities
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherCities.map((o) => (
              <Link
                key={o.slug}
                href={`/${cat.segment}/${state}/${o.slug}`}
                className="text-sm bg-brand-50 hover:bg-brand-100 text-brand-800 font-semibold px-3 py-1.5 rounded-full"
              >
                {o.name} <span className="font-normal text-brand-600">({o.count})</span>
              </Link>
            ))}
            <Link href={`/${cat.segment}/${state}`} className="text-sm text-brand-700 font-semibold px-3 py-1.5 hover:underline">
              All of {st.name} →
            </Link>
          </div>
        </section>
      )}

      <OtherCategories current={cat} stateSlugValue={state} citySlugValue={city} counts={counts} />
    </div>
  );
}
