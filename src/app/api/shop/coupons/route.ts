import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const coupons = await db.coupon.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(coupons);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const { code, type, amount, maxUses, expiresAt, minOrderCents } = await req.json();

  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return NextResponse.json({ error: "Code is required." }, { status: 400 });
  if (type !== "PERCENT" && type !== "FIXED") {
    return NextResponse.json({ error: "Type must be PERCENT or FIXED." }, { status: 400 });
  }
  const amountNum = Number(amount);
  if (!amountNum || amountNum <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }
  if (type === "PERCENT" && amountNum > 100) {
    return NextResponse.json({ error: "Percent-off can't exceed 100." }, { status: 400 });
  }

  const existing = await db.coupon.findUnique({ where: { shopId_code: { shopId: shop.id, code: normalizedCode } } });
  if (existing) return NextResponse.json({ error: `You already have a code "${normalizedCode}".` }, { status: 400 });

  const coupon = await db.coupon.create({
    data: {
      shopId: shop.id,
      code: normalizedCode,
      type,
      amount: type === "PERCENT" ? Math.round(amountNum) : Math.round(amountNum * 100),
      maxUses: maxUses ? Math.round(Number(maxUses)) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      minOrderCents: minOrderCents ? Math.round(Number(minOrderCents) * 100) : undefined,
    },
  });

  return NextResponse.json(coupon, { status: 201 });
}
