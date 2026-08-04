import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { discoverProductUrls, scrapeProductFromUrl, MAX_DISCOVER_COUNT } from "@/lib/urlImport";

// Discovering + scraping several product pages one after another can take a
// while; give this route real headroom beyond the platform default.
export const maxDuration = 60;

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

  let productUrls: string[];
  try {
    productUrls = await discoverProductUrls(url, count);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Couldn't find products on that page." }, { status: 400 });
  }

  const results = await Promise.all(
    productUrls.map(async (productUrl) => {
      try {
        const item = await scrapeProductFromUrl(productUrl);
        return { url: productUrl, ok: true as const, item };
      } catch (e: any) {
        return { url: productUrl, ok: false as const, error: e?.message || "Couldn't import that page." };
      }
    })
  );

  return NextResponse.json({ results, discoveredCount: productUrls.length, cap: MAX_DISCOVER_COUNT });
}
