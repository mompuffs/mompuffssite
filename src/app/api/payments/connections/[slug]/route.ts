import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  await db.paymentConnection.deleteMany({ where: { shopId: shop.id, slug: params.slug } });

  return NextResponse.json({ ok: true });
}
