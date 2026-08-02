import { NextResponse } from "next/server";
import { getShopPaymentCreds } from "@/lib/payments/connections";

// The publishable key is meant to be public -- this just tells the checkout
// page whether a given shop has Stripe connected, and if so, which
// publishable key to load Stripe.js with.
export async function GET(req: Request) {
  const shopId = new URL(req.url).searchParams.get("shopId");
  if (!shopId) return NextResponse.json({ available: false });

  const creds = await getShopPaymentCreds(shopId, "stripe");
  if (!creds || !creds.publishableKey) return NextResponse.json({ available: false });

  return NextResponse.json({ available: true, publishableKey: creds.publishableKey });
}
