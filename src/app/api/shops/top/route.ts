import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Same reason as /api/groups/top: no auth check to force dynamic rendering,
// so without this it gets statically cached and never reflects new visits.
export const dynamic = "force-dynamic";

export async function GET() {
  const shops = await db.shop.findMany({
    orderBy: { visitCount: "desc" },
    take: 10,
    select: { id: true, name: true, slug: true, bannerUrl: true, visitCount: true },
  });

  return NextResponse.json(shops);
}
