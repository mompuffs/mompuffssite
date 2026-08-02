import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getPodAdapter } from "@/lib/pod";
import { getShopCredentials } from "@/lib/pod/connections";

export async function GET(_req: Request, { params }: { params: { provider: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const adapter = getPodAdapter(params.provider);
  if (!adapter) return NextResponse.json({ error: "Unknown provider." }, { status: 404 });

  const creds = await getShopCredentials(shop.id, adapter.id);

  if (!adapter.isConfigured(creds)) {
    return NextResponse.json(
      { error: `${adapter.label} isn't connected. Connect it from your dashboard's Connections page.` },
      { status: 400 }
    );
  }

  try {
    const products = await adapter.listProducts(creds);
    return NextResponse.json(products);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch catalog." }, { status: 502 });
  }
}
