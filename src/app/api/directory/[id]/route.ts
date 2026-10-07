import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { geocodeAddress, uniqueListingSlug, validateListingInput } from "@/lib/directoryServer";

export const dynamic = "force-dynamic";

async function loadForEdit(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const listing = await db.businessListing.findUnique({ where: { id } });
  if (!listing) return { error: NextResponse.json({ error: "Listing not found." }, { status: 404 }) };
  const isAdmin = Boolean((user as any).isAdmin);
  if (!isAdmin && listing.submittedById !== (user as any).id) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { listing, isAdmin };
}

// Submitter or admin edits a listing. A member's edit goes back into the
// review queue so an approved listing can't be swapped for something else.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const r = await loadForEdit(params.id);
  if ("error" in r) return r.error;
  const { listing, isAdmin } = r;

  const parsed = validateListingInput(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const data = parsed.data;

  const addressChanged =
    data.street !== listing.street || data.city !== listing.city || data.state !== listing.state || data.zip !== listing.zip;
  let coords = { lat: listing.lat, lng: listing.lng };
  if (addressChanged) {
    const found = await geocodeAddress(data);
    if (!found) {
      return NextResponse.json(
        { error: "We couldn't find that address on the map. Double-check the street, city, state and ZIP." },
        { status: 400 }
      );
    }
    coords = found;
  }

  const renamed = data.name !== listing.name || data.city !== listing.city || data.state !== listing.state;
  const updated = await db.businessListing.update({
    where: { id: listing.id },
    data: {
      ...data,
      hours: data.hours ?? Prisma.DbNull,
      ...coords,
      slug: renamed ? await uniqueListingSlug(data.name, data.city, data.state, listing.id) : listing.slug,
      ...(isAdmin ? {} : { status: "PENDING", reviewNote: null }),
    },
    select: { id: true, slug: true, status: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const r = await loadForEdit(params.id);
  if ("error" in r) return r.error;
  await db.businessListing.delete({ where: { id: r.listing.id } });
  return NextResponse.json({ ok: true });
}
