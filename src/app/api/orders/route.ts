import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { createPaidOrder } from "@/lib/orders";

// Simulated checkout path (no processor connected / buyer skipped real
// payment): re-prices the cart server-side and creates a PAID order
// immediately, no money actually moves. Real-payment flows (e.g. PayPal)
// call createPaidOrder directly from their own capture endpoint instead.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { items, couponCode, billing, shipping, contactPhone } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  try {
    const { order } = await createPaidOrder({ buyerId: user.id, items, couponCode, billing, shipping, contactPhone });
    return NextResponse.json(order, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not place order." }, { status: 400 });
  }
}

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
