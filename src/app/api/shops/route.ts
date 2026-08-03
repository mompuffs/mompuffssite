import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
