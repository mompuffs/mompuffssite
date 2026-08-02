import { NextResponse } from "next/server";
import { getShopPaymentCreds } from "@/lib/payments/connections";

// Client ID is meant to be public (every PayPal JS SDK integration embeds it
// client-side) -- this just tells the checkout page whether a given shop has
// PayPal connected, and if so, which client ID to load the SDK with.
export async function GET(req: Request) {
  const shopId = new URL(req.url).searchParams.get("shopId");
  if (!shopId) return NextResponse.json({ available: false });

  const creds = await getShopPaymentCreds(shopId, "paypal");
  if (!creds) return NextResponse.json({ available: false });

  return NextResponse.json({ available: true, clientId: creds.clientId, environment: creds.environment });
}
