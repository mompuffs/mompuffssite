import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { US_STATES } from "@/lib/directory";

// Directory search treats a ZIP ("34241") or a place ("Sarasota",
// "Sarasota, FL", "sarasota fl") as a location and pulls in every business
// within NEAR_RADIUS_MILES of it, closest first. Place and ZIP centers come
// from the GeoPlace table (Census gazetteer).
export const NEAR_RADIUS_MILES = 60;

export type NearPlace = { label: string; lat: number; lng: number };

// Must match norm() in the gazetteer loader that filled GeoPlace.key.
export function normPlace(s: string) {
  return s
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^saint /, "st ")
    .replace(/^mount /, "mt ")
    .replace(/^fort /, "ft ");
}

// Split "Sarasota, FL" / "sarasota fl" / "Sarasota, Florida" into name + state.
function splitState(q: string): { name: string; state?: string } {
  const t = q.trim().replace(/,\s*$/, "");
  for (const s of US_STATES) {
    for (const suffix of [s.code, s.name]) {
      const re = new RegExp(`^(.+?)[,\\s]+${suffix.replace(/\s+/g, "\\s+")}$`, "i");
      const m = t.match(re);
      if (m) return { name: m[1].trim(), state: s.code };
    }
  }
  return { name: t };
}

export async function resolveNearPlace(q: string, stateFilter?: string): Promise<NearPlace | null> {
  const zip = q.trim().match(/^(\d{5})(-\d{4})?$/);
  if (zip) {
    const z = await db.geoPlace.findFirst({ where: { kind: "zip", key: zip[1] } });
    return z ? { label: `ZIP ${z.key}`, lat: z.lat, lng: z.lng } : null;
  }
  const { name, state } = splitState(q);
  const key = normPlace(name);
  if (key.length < 3) return null;
  const st = state ?? stateFilter;
  // A name that exists in several states (Springfield) without a state
  // given: take the biggest place.
  const p = await db.geoPlace.findFirst({
    where: { kind: "place", key, ...(st ? { state: st } : {}) },
    orderBy: { landSqMi: "desc" },
  });
  return p ? { label: `${p.name}, ${p.state}`, lat: p.lat, lng: p.lng } : null;
}

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Lat/lng rectangle around the place; callers trim the corners with milesBetween.
function nearBox(p: NearPlace, miles = NEAR_RADIUS_MILES): Prisma.BusinessListingWhereInput {
  const dLat = miles / 69;
  const dLng = miles / (69 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: { gte: p.lat - dLat, lte: p.lat + dLat }, lng: { gte: p.lng - dLng, lte: p.lng + dLng } };
}

// The filter shared by the directory page and its map pins: text matches on
// name/city/ZIP/about, plus (when q is a known place) everything nearby.
export function directorySearchWhere(opts: {
  q?: string;
  category?: string;
  state?: string;
  near?: NearPlace | null;
}): Prisma.BusinessListingWhereInput {
  const { q, category, state, near } = opts;
  return {
    status: "APPROVED",
    ...(category ? { category } : {}),
    // Near a place, the radius decides; a state filter would cut off the
    // other side of a state line (Kansas City).
    ...(state && !near ? { state } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { zip: { startsWith: q } },
            { about: { contains: q, mode: "insensitive" } },
            ...(near ? [nearBox(near)] : []),
          ],
        }
      : {}),
  };
}
