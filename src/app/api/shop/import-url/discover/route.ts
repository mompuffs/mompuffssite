import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { discoverProductUrls, scrapeProductFromUrl, MAX_DISCOVER_COUNT, normalizeSourceUrl } from "@/lib/urlImport";

export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const { url, maxCount } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Provide a shop or category page URL." }, { status: 400 });
  }
  const count = Number(maxCount) || 10;

  const existingUrlProducts = await db.product.findMany({
    where: { shopId: shop.id, source: "URL", externalId: { not: null } },
    select: { externalId: true },
  });
  const alreadyImported = new Set(
    existingUrlProducts.map((p) => normalizeSourceUrl(p.externalId as string)).filter(Boolean)
  );

  let productUrls: string[];
  try {
    productUrls = await discoverProductUrls(url, count, alreadyImported);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Couldn't find products on that page." }, { status: 400 });
  }

  const results = await Promise.all(
    productUrls.map(async (productUrl) => {
      try {
        const item = await scrapeProductFromUrl(productUrl);
        const normalized = normalizeSourceUrl(item.externalId || productUrl);
        if (alreadyImported.has(normalized)) {
          return { url: productUrl, ok: false as const, error: "Already imported." };
        }
        return { url: productUrl, ok: true as const, item, alreadyImported: false };
      } catch (e: any) {
        return { url: productUrl, ok: false as const, error: e?.message || "Couldn't import that page." };
      }
    })
  );

  const fresh = results.filter((r) => r.ok);
  const skipped = productUrls.length - fresh.length;

  return NextResponse.json({
    results: fresh,
    discoveredCount: productUrls.length,
    skippedDuplicates: skipped,
    cap: MAX_DISCOVER_COUNT,
  });
}
