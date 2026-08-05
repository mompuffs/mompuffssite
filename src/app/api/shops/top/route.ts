import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Same reason as /api/groups/top: no auth check to force dynamic rendering,
// so without this it gets statically cached and never reflects new visits.
export const dynamic = "force-dynamic";

const SHOP_SELECT = { id: true, name: true, slug: true, bannerUrl: true, visitCount: true } as const;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const randomFill = searchParams.get("fill") === "random";

  if (!randomFill) {
    const shops = await db.shop.findMany({
      orderBy: { visitCount: "desc" },
      take: 10,
      select: SHOP_SELECT,
    });
    return NextResponse.json(shops);
  }

  // Right-sidebar "Top Stores" block always wants a full list of up to 10 --
  // pad out with a random sample of the other shops when fewer than 10 have
  // real visits yet, so the block isn't sparse/empty for a young marketplace.
  const topShops = await db.shop.findMany({
    where: { visitCount: { gt: 0 } },
    orderBy: { visitCount: "desc" },
    take: 10,
    select: SHOP_SELECT,
  });

  let shops = topShops;
  if (shops.length < 10) {
    const excludeIds = shops.map((s) => s.id);
    const candidates = await db.shop.findMany({
      where: excludeIds.length > 0 ? { id: { notIn: excludeIds } } : undefined,
      select: SHOP_SELECT,
    });
    // Fisher-Yates shuffle so the padding shops are randomized, not just
    // whatever order the DB happens to return them in.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    shops = [...shops, ...candidates.slice(0, 10 - shops.length)];
  }

  return NextResponse.json(shops);
}
