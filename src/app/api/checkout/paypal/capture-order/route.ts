import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { priceCartItems } from "@/lib/checkout";
import { getShopPaymentCreds } from "@/lib/payments/connections";
import { captureOrder } from "@/lib/payments/paypal";
import { createPaidOrder } from "@/lib/orders";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { paypalOrderId, items, couponCode } = await req.json();
  if (!paypalOrderId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing order details." }, { status: 400 });
  }

  const priced = await priceCartItems(items);
  const shopIds = Array.from(new Set(priced.map((i) => i.shopId)));
  if (shopIds.length !== 1) {
    return NextResponse.json({ error: "Invalid cart for PayPal checkout." }, { status: 400 });
  }
  const shopId = shopIds[0];

  const creds = await getShopPaymentCreds(shopId, "paypal");
  if (!creds) {
    return NextResponse.json({ error: "This shop hasn't connected PayPal." }, { status: 400 });
  }

  let capture;
  try {
    capture = await captureOrder(
      { clientId: creds.clientId, apiKey: creds.apiKey, environment: creds.environment },
      paypalOrderId
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "PayPal capture failed." }, { status: 502 });
  }

  if (capture.status !== "COMPLETED") {
    return NextResponse.json({ error: `Payment not completed (status: ${capture.status}).` }, { status: 402 });
  }

  const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;

  try {
    const { order } = await createPaidOrder({
      buyerId: user.id,
      items,
      couponCode,
      paymentProvider: "PAYPAL",
      externalPaymentId: captureId,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (err: any) {
    // Payment was captured by PayPal but our order record failed -- this
    // needs manual reconciliation using the capture ID logged here.
    console.error(`PayPal capture ${captureId} succeeded but order creation failed:`, err);
    return NextResponse.json(
      { error: "Payment succeeded but we couldn't finish your order. Contact support with this reference: " + captureId },
      { status: 500 }
    );
  }
}
