import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { activateSubscription, cancelSubscription } from "@/lib/directoryBilling";

export const dynamic = "force-dynamic";

// Only the listing's claimed owner manages its subscription.
async function ownerListing(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const listing = await db.businessListing.findUnique({ where: { id }, select: { id: true, claimedById: true } });
  if (!listing) return { error: NextResponse.json({ error: "Listing not found." }, { status: 404 }) };
  if (listing.claimedById !== (user as any).id) {
    return { error: NextResponse.json({ error: "Only the listing's owner can manage its plan." }, { status: 403 }) };
  }
  return { listing };
}

// After PayPal's popup approves a subscription.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await ownerListing(params.id);
  if ("error" in r) return r.error;
  const { subscriptionId } = await req.json().catch(() => ({}));
  if (typeof subscriptionId !== "string" || !subscriptionId) {
    return NextResponse.json({ error: "Missing subscription." }, { status: 400 });
  }
  try {
    await activateSubscription(r.listing.id, subscriptionId);
  } catch (err: any) {
    console.error(`Directory subscription ${subscriptionId} activation failed:`, err);
    // Raw PayPal API errors are logged above, not shown to the buyer.
    const message = String(err.message ?? "").startsWith("PayPal ")
      ? "We couldn't confirm your PayPal payment."
      : err.message ?? "Couldn't activate the subscription.";
    return NextResponse.json(
      { error: `${message} If you were charged, contact us with this reference: ${subscriptionId}` },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const r = await ownerListing(params.id);
  if ("error" in r) return r.error;
  try {
    await cancelSubscription(r.listing.id);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Couldn't cancel." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
