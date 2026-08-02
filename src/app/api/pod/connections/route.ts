import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/crypto";
import { getPodAdapter, listPodAdapters } from "@/lib/pod";

// List each provider's connection status for the current shop. Never returns
// the decrypted secret -- just whether it's connected and a masked preview.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id }, include: { podConnections: true } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const byProvider = new Map(shop.podConnections.map((c) => [c.provider, c]));

  const result = listPodAdapters().map((adapter) => {
    const conn = byProvider.get(adapter.id);
    if (conn) {
      let preview = "••••";
      try {
        const key = decrypt(conn.apiKey);
        preview = key.length > 4 ? `••••${key.slice(-4)}` : "••••";
      } catch {
        // leave the generic mask if decryption fails
      }
      return {
        provider: adapter.id,
        label: adapter.label,
        fields: adapter.fields,
        connected: true,
        source: "shop" as const,
        preview,
        updatedAt: conn.updatedAt,
      };
    }

    return {
      provider: adapter.id,
      label: adapter.label,
      fields: adapter.fields,
      connected: false,
      source: "none" as const,
      preview: undefined,
      updatedAt: null,
    };
  });

  return NextResponse.json(result);
}

// Connect/update a provider: body { provider, values: { apiKey, ...extra } }
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const { provider, values } = await req.json();
  const adapter = getPodAdapter(provider);
  if (!adapter) return NextResponse.json({ error: "Unknown provider." }, { status: 404 });

  if (!values || typeof values !== "object") {
    return NextResponse.json({ error: "Missing credential values." }, { status: 400 });
  }
  for (const field of adapter.fields) {
    if (!values[field.key] || !String(values[field.key]).trim()) {
      return NextResponse.json({ error: `${field.label} is required.` }, { status: 400 });
    }
  }

  const { apiKey, ...extra } = values;

  await db.podConnection.upsert({
    where: { shopId_provider: { shopId: shop.id, provider: adapter.id } },
    create: {
      shopId: shop.id,
      provider: adapter.id,
      apiKey: encrypt(String(apiKey)),
      extra: Object.keys(extra).length > 0 ? encrypt(JSON.stringify(extra)) : undefined,
    },
    update: {
      apiKey: encrypt(String(apiKey)),
      extra: Object.keys(extra).length > 0 ? encrypt(JSON.stringify(extra)) : null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
