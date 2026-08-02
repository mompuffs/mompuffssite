import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const coupon = await db.coupon.findUnique({ where: { id: params.id } });
  if (!coupon || coupon.shopId !== shop.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { isActive } = await req.json();
  const updated = await db.coupon.update({
    where: { id: params.id },
    data: { isActive: Boolean(isActive) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const coupon = await db.coupon.findUnique({ where: { id: params.id } });
  if (!coupon || coupon.shopId !== shop.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await db.coupon.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
