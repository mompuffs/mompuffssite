import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { priceCartItems } from "@/lib/checkout";
import { evaluateCoupon } from "@/lib/coupons";
import { getShopPaymentCreds } from "@/lib/payments/connections";
import { retrievePaymentIntent } from "@/lib/payments/stripe";
import { createPaidOrder } from "@/lib/orders";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { paymentIntentId, items, couponCode } = await req.json();
  if (!paymentIntentId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing order details." }, { status: 400 });
  }

  const priced = await priceCartItems(items);
  const shopIds = Array.from(new Set(priced.map((i) => i.shopId)));
  if (shopIds.length !== 1) {
    return NextResponse.json({ error: "Invalid cart for Stripe checkout." }, { status: 400 });
  }
  const shopId = shopIds[0];

  const creds = await getShopPaymentCreds(shopId, "stripe");
  if (!creds) {
    return NextResponse.json({ error: "This shop hasn't connected Stripe." }, { status: 400 });
  }

  let intent;
  try {
    intent = await retrievePaymentIntent(creds as any, paymentIntentId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Stripe lookup failed." }, { status: 502 });
  }

  if (intent.status !== "succeeded") {
    return NextResponse.json({ error: `Payment not completed (status: ${intent.status}).` }, { status: 402 });
  }

  // Guard against a stale/mismatched intent being confirmed against a
  // different cart than the one it was created for.
  const totalCents = priced.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  let discountCents = 0;
  if (couponCode) {
    const result = await evaluateCoupon(couponCode, items);
    if (result.valid) discountCents = result.discountCents;
  }
  const expectedCents = Math.max(0, totalCents - discountCents);
  if (intent.amount !== expectedCents) {
    return NextResponse.json({ error: "Payment amount does not match cart total." }, { status: 400 });
  }

  try {
    const { order } = await createPaidOrder({
      buyerId: user.id,
      items,
      couponCode,
      paymentProvider: "STRIPE",
      externalPaymentId: intent.id,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (err: any) {
    // Payment succeeded on Stripe but our order record failed -- this needs
    // manual reconciliation using the payment intent ID logged here.
    console.error(`Stripe payment ${intent.id} succeeded but order creation failed:`, err);
    return NextResponse.json(
      { error: "Payment succeeded but we couldn't finish your order. Contact support with this reference: " + intent.id },
      { status: 500 }
    );
  }
}
