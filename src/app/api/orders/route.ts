import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { priceCartItems } from "@/lib/checkout";
import { evaluateCoupon } from "@/lib/coupons";

// Prototype checkout: no real payment processor is wired up. This endpoint
// trusts the client-submitted cart, re-prices every line item server-side
// against the database, and creates a PAID order immediately (simulated).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { items, couponCode } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const priced = await priceCartItems(items);
  if (priced.length === 0) {
    return NextResponse.json({ error: "No valid items in cart." }, { status: 400 });
  }

  const totalCents = priced.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  let discountCents = 0;
  let couponId: string | undefined;
  let couponCodeSnapshot: string | undefined;

  if (couponCode) {
    const result = await evaluateCoupon(couponCode, items);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    discountCents = result.discountCents;
    couponId = result.couponId;
    couponCodeSnapshot = result.code;
  }

  const finalTotalCents = Math.max(0, totalCents - discountCents);

  const order = await db.$transaction(async (tx) => {
    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    }
    return tx.order.create({
      data: {
        buyerId: user.id,
        status: "PAID",
        totalCents: finalTotalCents,
        discountCents,
        couponCode: couponCodeSnapshot,
        couponId,
        items: {
          create: priced.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            variantLabel: i.variantLabel,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
  });

  return NextResponse.json(order, { status: 201 });
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
