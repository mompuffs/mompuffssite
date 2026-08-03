import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { scrapeProductFromUrl } from "@/lib/urlImport";

const MAX_URLS_PER_REQUEST = 10;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const { urls } = await req.json();
  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "Provide at least one URL." }, { status: 400 });
  }
  if (urls.length > MAX_URLS_PER_REQUEST) {
    return NextResponse.json({ error: `Please paste ${MAX_URLS_PER_REQUEST} URLs or fewer at a time.` }, { status: 400 });
  }

  const results = await Promise.all(
    urls.map(async (url: string) => {
      try {
        const item = await scrapeProductFromUrl(String(url));
        return { url, ok: true as const, item };
      } catch (e: any) {
        return { url, ok: false as const, error: e?.message || "Couldn't import that page." };
      }
    })
  );

  return NextResponse.json({ results });
}
