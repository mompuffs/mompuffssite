import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ADDRESS_NOT_FOUND, locateListing, uniqueListingSlug, validateListingInput } from "@/lib/directoryServer";
import { canEditListing } from "@/lib/directory";
import { CANCELLABLE_STATUSES, cancelSubscription } from "@/lib/directoryBilling";

export const dynamic = "force-dynamic";

async function loadForEdit(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const listing = await db.businessListing.findUnique({ where: { id } });
  if (!listing) return { error: NextResponse.json({ error: "Listing not found." }, { status: 404 }) };
  const userId = (user as any).id as string;
  const isAdmin = Boolean((user as any).isAdmin);
  if (!canEditListing(listing, userId, isAdmin)) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { listing, isAdmin, isOwner: listing.claimedById === userId };
}

// Edit a listing. Admin and claimed-owner edits go live as-is; an unclaimed
// submitter's edit goes back into the review queue so an approved listing
// can't be swapped for something else.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const r = await loadForEdit(params.id);
  if ("error" in r) return r.error;
  const { listing, isAdmin, isOwner } = r;

  const parsed = validateListingInput(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const data = parsed.data;

  const addressChanged =
    data.street !== listing.street || data.city !== listing.city || data.state !== listing.state || data.zip !== listing.zip;
  let coords = { lat: listing.lat, lng: listing.lng };
  if (addressChanged) {
    const found = await locateListing(data);
    if (!found) return NextResponse.json({ error: ADDRESS_NOT_FOUND }, { status: 400 });
    coords = found;
  }

  const renamed = data.name !== listing.name || data.city !== listing.city || data.state !== listing.state;
  const updated = await db.businessListing.update({
    where: { id: listing.id },
    data: {
      ...data,
      hours: data.hours ?? Prisma.DbNull,
      ...coords,
      slug: renamed ? await uniqueListingSlug(data.name, data.city ?? "", data.state, listing.id) : listing.slug,
      ...(isAdmin || isOwner ? {} : { status: "PENDING", reviewNote: null }),
    },
    select: { id: true, slug: true, status: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const r = await loadForEdit(params.id);
  if ("error" in r) return r.error;
  // Don't leave PayPal billing someone for a listing that's gone.
  if (r.listing.paypalSubscriptionId && CANCELLABLE_STATUSES.includes(r.listing.subscriptionStatus ?? "")) {
    try {
      await cancelSubscription(r.listing.id);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Couldn't cancel this listing's PayPal subscription, so it wasn't deleted: ${err.message}` },
        { status: 502 }
      );
    }
  }
  await db.businessListing.delete({ where: { id: r.listing.id } });
  return NextResponse.json({ ok: true });
}
