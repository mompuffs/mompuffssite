import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id }, select: { flatShippingCents: true } });
  if (!shop) return NextResponse.json({ error: "No shop." }, { status: 400 });

  return NextResponse.json(shop);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "No shop." }, { status: 400 });

  const { flatShippingCents } = await req.json();
  if (typeof flatShippingCents !== "number" || flatShippingCents < 0) {
    return NextResponse.json({ error: "flatShippingCents must be a non-negative number." }, { status: 400 });
  }

  const updated = await db.shop.update({
    where: { id: shop.id },
    data: { flatShippingCents: Math.round(flatShippingCents) },
  });

  return NextResponse.json({ flatShippingCents: updated.flatShippingCents });
}
