import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { CANCELLABLE_STATUSES, cancelSubscription } from "@/lib/directoryBilling";
import { recomputeCompleteness } from "@/lib/directoryServer";

export const dynamic = "force-dynamic";

const STATUSES = ["APPROVED", "REJECTED", "PENDING"];

// Admin moderation. One of:
//   { status, reviewNote? }  approve / reject (note shown to submitter) / back to pending
//   { fullAccess: boolean }  show every field publicly without a subscription
//   { unclaim: true }        remove the owner's claim (cancels their subscription)
//   { cancelSubscription: true }  stop the owner's PayPal billing; the listing stays
//                            up and keeps premium through what they've paid for
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const listing = await db.businessListing.findUnique({
    where: { id: params.id },
    select: { approvedAt: true, paypalSubscriptionId: true, subscriptionStatus: true },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  if (typeof body.fullAccess === "boolean") {
    await db.businessListing.update({ where: { id: params.id }, data: { fullAccess: body.fullAccess } });
    return NextResponse.json({ ok: true });
  }

  const cancellable = Boolean(listing.paypalSubscriptionId) && CANCELLABLE_STATUSES.includes(listing.subscriptionStatus ?? "");

  if (body.cancelSubscription === true) {
    if (!cancellable) return NextResponse.json({ error: "This listing has no active subscription." }, { status: 400 });
    try {
      await cancelSubscription(params.id);
    } catch (err: any) {
      return NextResponse.json({ error: `PayPal couldn't cancel it: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.unclaim === true) {
    if (cancellable) {
      try {
        await cancelSubscription(params.id);
      } catch (err: any) {
        return NextResponse.json({ error: `Couldn't cancel their PayPal subscription: ${err.message}` }, { status: 502 });
      }
    }
    await db.businessListing.update({
      where: { id: params.id },
      data: {
        claimedById: null,
        claimedAt: null,
        paypalSubscriptionId: null,
        plan: null,
        subscriptionStatus: null,
        nextBillingAt: null,
        premiumUntil: null,
        reminderSentFor: null,
      },
    });
    await recomputeCompleteness(params.id);
    return NextResponse.json({ ok: true });
  }

  const { status, reviewNote } = body;
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  await db.businessListing.update({
    where: { id: params.id },
    data: {
      status,
      reviewNote: status === "REJECTED" && typeof reviewNote === "string" ? reviewNote.trim().slice(0, 500) || null : null,
      approvedAt: status === "APPROVED" ? listing.approvedAt ?? new Date() : listing.approvedAt,
    },
  });
  return NextResponse.json({ ok: true });
}
