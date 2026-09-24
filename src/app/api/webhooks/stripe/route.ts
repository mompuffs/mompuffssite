import { NextResponse } from "next/server";
import { orderByPaymentId, syncOrderRefunds } from "@/lib/refundSync";

// Optional Stripe webhook (charge.refunded, charge.dispute.closed) for shops that use
// Stripe. Like the PayPal one, the payload only says which payment changed; refunds are
// then read from the shop's own Stripe account, so no signing secret is needed.

export async function POST(req: Request) {
  let event: { type?: string; data?: { object?: { payment_intent?: string | { id?: string } } } };
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  if (event.type !== "charge.refunded" && event.type !== "charge.refund.updated" && event.type !== "charge.dispute.closed") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }
  const pi = event.data?.object?.payment_intent;
  const paymentIntentId = typeof pi === "string" ? pi : pi?.id;
  if (!paymentIntentId) return NextResponse.json({ ok: true, ignored: "no payment intent" });

  const order = await orderByPaymentId(paymentIntentId);
  if (!order) return NextResponse.json({ ok: true, ignored: "unknown payment" });

  try {
    return NextResponse.json({ ok: true, reported: await syncOrderRefunds(order) });
  } catch (err) {
    console.error(`Stripe webhook ${event.type} for ${paymentIntentId} failed:`, err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
