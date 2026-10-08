import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { sendDirectoryClaimNotification } from "@/lib/email";
import { recomputeCompleteness } from "@/lib/directoryServer";

export const dynamic = "force-dynamic";

// Instant claim: any signed-in member can claim an approved listing nobody
// has claimed yet. The site owner gets an email so a bad claim can be
// undone from Admin -> Directory.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to claim this listing." }, { status: 401 });
  const userId = (user as any).id as string;

  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== true) {
    return NextResponse.json({ error: "Confirm that you own or manage this business." }, { status: 400 });
  }

  // Conditional update so two people claiming at once can't both win.
  const { count } = await db.businessListing.updateMany({
    where: { id: params.id, status: "APPROVED", claimedById: null },
    data: { claimedById: userId, claimedAt: new Date() },
  });
  if (count === 0) {
    return NextResponse.json({ error: "This listing has already been claimed." }, { status: 409 });
  }

  await recomputeCompleteness(params.id);

  const [listing, claimer] = await Promise.all([
    db.businessListing.findUnique({ where: { id: params.id }, select: { name: true, slug: true } }),
    db.user.findUnique({ where: { id: userId }, select: { displayName: true, username: true, email: true } }),
  ]);
  if (listing && claimer) {
    await sendDirectoryClaimNotification({
      listingName: listing.name,
      listingSlug: listing.slug,
      claimerName: claimer.displayName,
      claimerUsername: claimer.username,
      claimerEmail: claimer.email,
    });
  }

  return NextResponse.json({ ok: true, slug: listing?.slug });
}
