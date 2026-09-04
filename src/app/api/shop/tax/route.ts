import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

async function ownerShop(userId: string) {
  return db.shop.findUnique({ where: { ownerId: userId } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const shop = await ownerShop(user.id);
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const rates = await db.taxRate.findMany({
    where: { shopId: shop.id },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rates);
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const shop = await ownerShop(user.id);
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const rate = await db.taxRate.create({ data: { shopId: shop.id } });
  return NextResponse.json(rate, { status: 201 });
}
