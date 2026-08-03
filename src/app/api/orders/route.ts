import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Buyer's order history. Orders are only ever created by a real payment
// processor's capture/confirm endpoint (see /api/checkout/paypal and
// /api/checkout/stripe) -- there is no simulated/no-payment path anymore.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const orders = await db.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(orders);
}
