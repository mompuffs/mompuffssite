import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const EDITABLE_FIELDS = ["countryCode", "stateCode", "postcode", "city", "taxName"] as const;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const existing = await db.taxRate.findFirst({ where: { id: params.id, shopId: shop.id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = String(body[field] ?? "").trim() || "*";
  }
  if (body.rate !== undefined) {
    const rate = Number(body.rate);
    if (!isFinite(rate) || rate < 0) return NextResponse.json({ error: "Rate must be a non-negative number." }, { status: 400 });
    data.rate = rate;
  }
  if (body.priority !== undefined) {
    const priority = Math.round(Number(body.priority));
    if (!isFinite(priority) || priority < 1) return NextResponse.json({ error: "Priority must be a positive number." }, { status: 400 });
    data.priority = priority;
  }
  if (body.compound !== undefined) data.compound = Boolean(body.compound);
  if (body.shipping !== undefined) data.shipping = Boolean(body.shipping);

  const updated = await db.taxRate.update({ where: { id: existing.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  await db.taxRate.deleteMany({ where: { id: params.id, shopId: shop.id } });
  return NextResponse.json({ ok: true });
}
