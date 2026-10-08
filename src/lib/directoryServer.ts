import { db } from "@/lib/db";
import { US_STATES, categoryFor, fullAddress, normalizeUrl, parseHours, type Hours } from "@/lib/directory";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function uniqueListingSlug(name: string, city: string, state: string, excludeId?: string) {
  const base = slugify(`${name} ${city} ${state}`) || "business";
  let slug = base;
  for (let n = 2; ; n++) {
    const hit = await db.businessListing.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base}-${n}`;
  }
}

// Address -> coordinates. The US Census geocoder is free, keyless and
// accurate for street addresses; OpenStreetMap's Nominatim is the fallback
// for addresses the Census file doesn't know (new construction, suites).
export async function geocodeAddress(a: {
  street: string;
  city: string | null;
  state: string;
  zip: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const oneLine = fullAddress(a);
  try {
    const url =
      "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=" +
      encodeURIComponent(oneLine);
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const c = data?.result?.addressMatches?.[0]?.coordinates;
      if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) return { lat: c.y, lng: c.x };
    }
  } catch {
    // fall through to Nominatim
  }
  const queries = [oneLine];
  for (const q of queries) {
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" + encodeURIComponent(q);
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": "mompuffs.com business directory (info@mompuffs.com)" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const hit = data?.[0];
        if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon) };
      }
    } catch {
      // try next
    }
  }
  return null;
}

export type ListingInput = {
  name: string;
  category: string;
  street: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  menuUrl: string | null;
  imageUrl: string | null;
  about: string;
  specials: string | null;
  hours: Hours | null;
};

function str(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Validates a submit/edit body. Returns the cleaned fields or a message
// suitable for showing the member.
export function validateListingInput(body: any): { data: ListingInput } | { error: string } {
  const name = str(body?.name, 120);
  const category = str(body?.category, 40);
  const street = str(body?.street, 160) || null;
  const city = str(body?.city, 80) || null;
  const state = str(body?.state, 2).toUpperCase();
  const zip = str(body?.zip, 10) || null;
  const email = str(body?.email, 200) || null;
  const about = str(body?.about, 5000);
  const phone = str(body?.phone, 30) || null;
  const specials = str(body?.specials, 2000) || null;

  if (!name) return { error: "Business name is required." };
  if (!categoryFor(category)) return { error: "Pick a category." };
  if (!US_STATES.some((s) => s.code === state)) return { error: "Pick a state." };
  if (street && !city) return { error: "Add the city for that street address." };
  if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) return { error: "Enter a 5-digit ZIP code." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };
  if (!about) return { error: "Tell people about the business in the About section." };
  if (phone && phone.replace(/\D/g, "").length < 10) return { error: "That phone number looks incomplete." };

  const website = normalizeUrl(body?.website);
  if (str(body?.website, 500) && !website) return { error: "That website address doesn't look right." };
  const menuUrl = normalizeUrl(body?.menuUrl);
  if (str(body?.menuUrl, 500) && !menuUrl) return { error: "That menu link doesn't look right." };
  const imageUrl = normalizeUrl(body?.imageUrl);

  return {
    data: {
      name,
      category,
      street,
      city,
      state,
      zip,
      phone,
      email,
      website,
      menuUrl,
      imageUrl,
      about,
      specials,
      hours: parseHours(body?.hours),
    },
  };
}

// Map coordinates for a listing: only when there's a street address to pin.
// Returns undefined when a street was given but couldn't be found.
export async function locateListing(data: ListingInput): Promise<{ lat: number | null; lng: number | null } | undefined> {
  if (!data.street) return { lat: null, lng: null };
  return (await geocodeAddress({ ...data, street: data.street })) ?? undefined;
}

export const ADDRESS_NOT_FOUND =
  "We couldn't find that street address on the map. Double-check it, or leave the street blank.";

// Directory sort key: owner-managed, state-licensed and fuller listings first.
export function listingCompleteness(l: {
  claimedById?: string | null;
  licenseNumber?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  street?: string | null;
  hours?: unknown;
  email?: string | null;
  menuUrl?: string | null;
}) {
  return (
    (l.claimedById ? 8 : 0) +
    (l.licenseNumber ? 3 : 0) +
    (l.website ? 4 : 0) +
    (l.imageUrl ? 3 : 0) +
    (l.phone ? 2 : 0) +
    (l.street ? 2 : 0) +
    (l.hours ? 1 : 0) +
    (l.email ? 1 : 0) +
    (l.menuUrl ? 1 : 0)
  );
}

// For writes that don't go through the full form (claim, unclaim).
export async function recomputeCompleteness(id: string) {
  const l = await db.businessListing.findUnique({ where: { id } });
  if (!l) return;
  await db.businessListing.update({ where: { id }, data: { completeness: listingCompleteness(l) } });
}
