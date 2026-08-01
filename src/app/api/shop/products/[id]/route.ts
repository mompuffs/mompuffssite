import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "No shop." }, { status: 400 });

  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product || product.shopId !== shop.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await db.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
