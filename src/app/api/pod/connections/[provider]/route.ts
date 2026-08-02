import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getPodAdapter } from "@/lib/pod";

export async function DELETE(_req: Request, { params }: { params: { provider: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const adapter = getPodAdapter(params.provider);
  if (!adapter) return NextResponse.json({ error: "Unknown provider." }, { status: 404 });

  await db.podConnection.deleteMany({ where: { shopId: shop.id, provider: adapter.id } });

  return NextResponse.json({ ok: true });
}
