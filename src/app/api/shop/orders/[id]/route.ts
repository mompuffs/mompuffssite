import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Marks (or unmarks) THIS shop's line items within an order as fulfilled --
// never touches other shops' items in the same multi-vendor order.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "No shop." }, { status: 400 });

  const { completed } = await req.json();
  if (typeof completed !== "boolean") {
    return NextResponse.json({ error: "completed must be a boolean." }, { status: 400 });
  }

  const items = await db.orderItem.findMany({
    where: { orderId: params.id, product: { shopId: shop.id } },
    select: { id: true },
  });
  if (items.length === 0) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  await db.orderItem.updateMany({
    where: { id: { in: items.map((i) => i.id) } },
    data: { fulfilledAt: completed ? new Date() : null },
  });

  return NextResponse.json({ ok: true });
}
