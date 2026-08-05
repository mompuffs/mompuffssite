import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "No shop." }, { status: 400 });

  const requests = await db.refundRequest.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    include: {
      orderItem: {
        select: {
          id: true,
          orderId: true,
          quantity: true,
          unitPriceCents: true,
          variantLabel: true,
          product: { select: { title: true } },
          order: { select: { buyer: { select: { username: true, displayName: true, email: true } } } },
        },
      },
    },
  });

  return NextResponse.json(requests);
}
