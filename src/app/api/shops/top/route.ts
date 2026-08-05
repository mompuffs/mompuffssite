import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const shops = await db.shop.findMany({
    orderBy: { visitCount: "desc" },
    take: 10,
    select: { id: true, name: true, slug: true, bannerUrl: true, visitCount: true },
  });

  return NextResponse.json(shops);
}
