import { db } from "@/lib/db";
import { LISTING_CARD_SELECT } from "@/components/DirectoryListingCard";
import { LOCATION_CATEGORIES, stateFromSlug, stateName, stateSlug, type LocationCategory } from "@/lib/directory";

// Data for the location pages: /<segment>, /<segment>/<state>,
// /<segment>/<state>/<city> (segment = dispensaries | smoke-shops | mmj-doctors).

export const LOCATION_PAGE_SIZE = 30;

export function categoryForSegment(segment: string): LocationCategory {
  const c = LOCATION_CATEGORIES.find((x) => x.segment === segment);
  if (!c) throw new Error(`Unknown location segment ${segment}`);
  return c;
}

const live = (category: string) => ({ status: "APPROVED", category });

export async function getCategoryStates(cat: LocationCategory) {
  const [all, licensed] = await Promise.all([
    db.businessListing.groupBy({ by: ["state"], where: live(cat.slug), _count: { _all: true } }),
    db.businessListing.groupBy({ by: ["state"], where: { ...live(cat.slug), licenseNumber: { not: null } }, _count: { _all: true } }),
  ]);
  return all
    .map((s) => ({
      code: s.state,
      name: stateName(s.state),
      slug: stateSlug(s.state),
      count: s._count._all,
      licensed: licensed.find((x) => x.state === s.state)?._count._all ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Cities in a state, merged across spelling variants by citySlug; the
// most common spelling is the display name.
export async function getStateCities(cat: LocationCategory, state: string) {
  const rows = await db.businessListing.groupBy({
    by: ["citySlug", "city"],
    where: { ...live(cat.slug), state, citySlug: { not: null } },
    _count: { _all: true },
  });
  const merged = new Map<string, { slug: string; name: string; count: number; best: number }>();
  for (const r of rows) {
    const key = r.citySlug!;
    const cur = merged.get(key) ?? { slug: key, name: r.city!, count: 0, best: 0 };
    cur.count += r._count._all;
    if (r._count._all > cur.best) {
      cur.best = r._count._all;
      cur.name = r.city!;
    }
    merged.set(key, cur);
  }
  return Array.from(merged.values())
    .map(({ slug, name, count }) => ({ slug, name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getStatePage(cat: LocationCategory, stateSlugParam: string, page: number) {
  const st = stateFromSlug(stateSlugParam);
  if (!st) return null;
  const where = { ...live(cat.slug), state: st.code };
  const [total, licensed, cities, listings] = await Promise.all([
    db.businessListing.count({ where }),
    db.businessListing.count({ where: { ...where, licenseNumber: { not: null } } }),
    getStateCities(cat, st.code),
    db.businessListing.findMany({
      where,
      orderBy: [{ completeness: "desc" }, { name: "asc" }],
      skip: (page - 1) * LOCATION_PAGE_SIZE,
      take: LOCATION_PAGE_SIZE,
      select: LISTING_CARD_SELECT,
    }),
  ]);
  if (total === 0) return null;
  return { state: st, total, licensed, cities, listings };
}

export async function getCityPage(cat: LocationCategory, stateSlugParam: string, city: string) {
  const st = stateFromSlug(stateSlugParam);
  if (!st) return null;
  const where = { ...live(cat.slug), state: st.code, citySlug: city };
  const [listings, cities] = await Promise.all([
    db.businessListing.findMany({
      where,
      orderBy: [{ completeness: "desc" }, { name: "asc" }],
      take: 200,
      select: LISTING_CARD_SELECT,
    }),
    getStateCities(cat, st.code),
  ]);
  if (listings.length === 0) return null;
  const here = cities.find((c) => c.slug === city);
  return {
    state: st,
    city: { slug: city, name: here?.name ?? listings[0].city ?? city },
    listings,
    licensed: listings.filter((l) => l.licenseNumber).length,
    otherCities: cities.filter((c) => c.slug !== city).slice(0, 15),
  };
}
