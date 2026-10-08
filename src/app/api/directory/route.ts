import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  ADDRESS_NOT_FOUND,
  listingCompleteness,
  locateListing,
  uniqueListingSlug,
  validateListingInput,
} from "@/lib/directoryServer";

export const dynamic = "force-dynamic";

// Member submits a business. Three paths:
//   - admin: live right away, every field shown (fullAccess)
//   - free (listingType "FREE"): waits for admin approval
//   - premium ("PREMIUM"): saved as a hidden DRAFT owned by the submitter;
//     paying for the PayPal subscription publishes it with no review
//     (activateSubscription in src/lib/directoryBilling.ts). Unpaid drafts
//     are cleaned up by the daily cron.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit a business." }, { status: 401 });
  const userId = (user as any).id as string;
  const isAdmin = Boolean((user as any).isAdmin);

  if (!isAdmin && !(await checkRateLimit(`directory-submit:${userId}`, 10, 24 * 60 * 60 * 1000))) {
    return NextResponse.json({ error: "You've submitted a lot today. Try again tomorrow." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const premium = !isAdmin && body?.listingType === "PREMIUM";
  if (premium && body?.ownerConfirm !== true) {
    return NextResponse.json({ error: "Confirm that you own or manage this business." }, { status: 400 });
  }
  const parsed = validateListingInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const data = parsed.data;

  const coords = await locateListing(data);
  if (!coords) return NextResponse.json({ error: ADDRESS_NOT_FOUND }, { status: 400 });

  const listing = await db.businessListing.create({
    data: {
      ...data,
      hours: data.hours ?? undefined,
      ...coords,
      slug: await uniqueListingSlug(data.name, data.city ?? "", data.state),
      submittedById: userId,
      status: isAdmin ? "APPROVED" : premium ? "DRAFT" : "PENDING",
      approvedAt: isAdmin ? new Date() : null,
      fullAccess: isAdmin,
      ...(premium ? { claimedById: userId, claimedAt: new Date() } : {}),
      completeness: listingCompleteness({ ...data, claimedById: premium ? userId : null }),
    },
    select: { id: true, slug: true, status: true },
  });

  return NextResponse.json(listing, { status: 201 });
}
