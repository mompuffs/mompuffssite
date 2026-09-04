import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { priceCartItems } from "@/lib/checkout";
import { evaluateCoupon } from "@/lib/coupons";
import { calculateShippingCents } from "@/lib/shipping";
import { calculateCartTax } from "@/lib/tax";
import { getShopPaymentCreds } from "@/lib/payments/connections";
import { createOrder } from "@/lib/payments/paypal";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { items, couponCode, shipping } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const priced = await priceCartItems(items);
  if (priced.length === 0) {
    return NextResponse.json({ error: "No valid items in cart." }, { status: 400 });
  }

  const shopIds = Array.from(new Set(priced.map((i) => i.shopId)));
  if (shopIds.length > 1) {
    return NextResponse.json(
      { error: "PayPal checkout supports one shop at a time -- please check out each shop separately." },
      { status: 400 }
    );
  }
  const shopId = shopIds[0];

  const creds = await getShopPaymentCreds(shopId, "paypal");
  if (!creds) {
    return NextResponse.json({ error: "This shop hasn't connected PayPal." }, { status: 400 });
  }

  const totalCents = priced.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  const shippingCents = await calculateShippingCents(priced);
  let discountCents = 0;
  if (couponCode) {
    const result = await evaluateCoupon(couponCode, items);
    if (!result.valid) return NextResponse.json({ error: result.error }, { status: 400 });
    discountCents = result.discountCents;
  }
  const { taxCents } = await calculateCartTax({
    priced,
    shippingCents,
    discountCents,
    address: {
      country: shipping?.country,
      state: shipping?.state,
      postcode: shipping?.zip,
      city: shipping?.city,
    },
  });
  const finalTotalCents = Math.max(0, totalCents - discountCents) + shippingCents + taxCents;
  if (finalTotalCents <= 0) {
    return NextResponse.json({ error: "Order total must be greater than zero." }, { status: 400 });
  }

  try {
    const paypalOrder = await createOrder(
      { clientId: creds.clientId, apiKey: creds.apiKey, environment: creds.environment },
      finalTotalCents
    );
    return NextResponse.json({ paypalOrderId: paypalOrder.id, taxCents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not start PayPal checkout." }, { status: 502 });
  }
}
