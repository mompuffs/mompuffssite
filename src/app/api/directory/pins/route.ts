import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { categoryFor, US_STATES } from "@/lib/directory";
import { directorySearchWhere, resolveNearPlace } from "@/lib/geoSearch";

// Map pins for the directory and location pages, fetched by the map after
// the page loads (keeps thousands of pins out of the page HTML). Compact
// rows: [slug, name, category, lat, lng, city, state]. Public and cached at
// the edge for a few minutes. force-dynamic: a public GET with no auth
// check would otherwise be cached at build time forever.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = categoryFor(searchParams.get("category"))?.slug;
  const state = US_STATES.find((s) => s.code === searchParams.get("state"))?.code;
  const city = searchParams.get("city") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;

  const near = q ? await resolveNearPlace(q, state) : null;
  const where: Prisma.BusinessListingWhereInput = {
    ...directorySearchWhere({ q, category, state, near }),
    lat: { not: null },
    lng: { not: null },
    ...(city ? { citySlug: city } : {}),
  };
  const rows = await db.businessListing.findMany({
    where,
    take: 20000,
    select: { slug: true, name: true, category: true, lat: true, lng: true, city: true, state: true },
  });

  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return NextResponse.json(
    rows.map((r) => [r.slug, r.name, r.category, round(r.lat!), round(r.lng!), r.city, r.state]),
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
