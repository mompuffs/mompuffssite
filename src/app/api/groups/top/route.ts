import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const groups = await db.group.findMany({
    where: { visibility: "PUBLIC" },
    select: {
      id: true,
      name: true,
      slug: true,
      avatarUrl: true,
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
    },
  });

  const top = groups
    .sort((a, b) => b._count.members - a._count.members)
    .slice(0, 10)
    .map((g) => ({ id: g.id, name: g.name, slug: g.slug, avatarUrl: g.avatarUrl, memberCount: g._count.members }));

  return NextResponse.json(top);
}
