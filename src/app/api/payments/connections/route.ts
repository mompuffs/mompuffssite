import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/crypto";
import { BUILTIN_PAYMENT_PROVIDERS, CUSTOM_PAYMENT_FIELDS } from "@/lib/payments/providers";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function maskPreview(apiKey: string) {
  try {
    const key = decrypt(apiKey);
    return key.length > 4 ? `••••${key.slice(-4)}` : "••••";
  } catch {
    return "••••";
  }
}

// List built-in providers (always shown) plus any custom ones this shop has
// added. Never returns decrypted secrets -- just connection status + a
// masked preview.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id }, include: { paymentConnections: true } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const bySlug = new Map(shop.paymentConnections.map((c) => [c.slug, c]));

  const builtins = BUILTIN_PAYMENT_PROVIDERS.map((p) => {
    const conn = bySlug.get(p.slug);
    return {
      slug: p.slug,
      provider: p.provider,
      label: p.label,
      fields: p.fields,
      builtin: true,
      connected: Boolean(conn),
      preview: conn ? maskPreview(conn.apiKey) : undefined,
      updatedAt: conn?.updatedAt ?? null,
    };
  });

  const builtinSlugs = new Set(BUILTIN_PAYMENT_PROVIDERS.map((p) => p.slug));
  const customs = shop.paymentConnections
    .filter((c) => !builtinSlugs.has(c.slug))
    .map((c) => ({
      slug: c.slug,
      provider: "CUSTOM" as const,
      label: c.displayName,
      fields: CUSTOM_PAYMENT_FIELDS,
      builtin: false,
      connected: true,
      preview: maskPreview(c.apiKey),
      updatedAt: c.updatedAt,
    }));

  return NextResponse.json({ builtins, customs });
}

// Connect/update a processor.
// Built-in: body { slug: "stripe"|"paypal"|"square", values: {...} }
// Custom:   body { displayName: "Authorize.net", values: {...}, slug?: existing-slug-to-update }
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const body = await req.json();
  const { values } = body;
  if (!values || typeof values !== "object") {
    return NextResponse.json({ error: "Missing credential values." }, { status: 400 });
  }

  const builtin = BUILTIN_PAYMENT_PROVIDERS.find((p) => p.slug === body.slug);

  let slug: string;
  let provider: string;
  let displayName: string;
  let fields;

  if (builtin) {
    slug = builtin.slug;
    provider = builtin.provider;
    displayName = builtin.label;
    fields = builtin.fields;
  } else {
    const name = String(body.displayName ?? "").trim();
    if (!name) return NextResponse.json({ error: "A name for this processor is required." }, { status: 400 });
    provider = "CUSTOM";
    displayName = name;
    fields = CUSTOM_PAYMENT_FIELDS;

    if (body.slug) {
      // Updating an existing custom connection -- keep its slug.
      slug = String(body.slug);
    } else {
      const base = slugify(name);
      slug = base;
      let n = 1;
      while (await db.paymentConnection.findUnique({ where: { shopId_slug: { shopId: shop.id, slug } } })) {
        n++;
        slug = `${base}-${n}`;
      }
    }
  }

  for (const field of fields) {
    if (!values[field.key] || !String(values[field.key]).trim()) {
      return NextResponse.json({ error: `${field.label} is required.` }, { status: 400 });
    }
  }

  const { apiKey, ...extra } = values;

  await db.paymentConnection.upsert({
    where: { shopId_slug: { shopId: shop.id, slug } },
    create: {
      shopId: shop.id,
      provider,
      slug,
      displayName,
      apiKey: encrypt(String(apiKey)),
      extra: Object.keys(extra).length > 0 ? encrypt(JSON.stringify(extra)) : undefined,
    },
    update: {
      displayName,
      apiKey: encrypt(String(apiKey)),
      extra: Object.keys(extra).length > 0 ? encrypt(JSON.stringify(extra)) : null,
    },
  });

  return NextResponse.json({ ok: true, slug }, { status: 201 });
}
