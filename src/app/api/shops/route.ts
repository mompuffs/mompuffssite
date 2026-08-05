import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Same class of bug as /api/groups/top and /api/shops/top: no auth check to
// force dynamic rendering, so without this it gets statically cached and
// the navbar's marketplace dropdown never picks up newly created shops.
export const dynamic = "force-dynamic";

export async function GET() {
  const shops = await db.shop.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      bannerUrl: true,
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json(
    shops.map((s) => ({ id: s.id, name: s.name, slug: s.slug, bannerUrl: s.bannerUrl, productCount: s._count.products }))
  );
}
