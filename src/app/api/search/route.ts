import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Powers the navbar's live search dropdown -- capped per category so the
// dropdown stays short. The full /search page re-queries with higher caps
// instead of paginating this endpoint, same division of labor as
// /api/groups (list) vs a client search box elsewhere in the app.
export const dynamic = "force-dynamic";

const PREVIEW_LIMIT = 5;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ users: [], groups: [], shops: [], products: [] });

  // Members and groups are members-only; visitors just get shops and products.
  const member = Boolean(await getCurrentUser());
  const [users, groups, shops, products] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
        ],
      },
      take: member ? PREVIEW_LIMIT : 0,
      orderBy: { displayName: "asc" },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    }),
    db.group.findMany({
      where: {
        OR: [{ name: { contains: q, mode: "insensitive" } }, { topic: { contains: q, mode: "insensitive" } }],
      },
      take: member ? PREVIEW_LIMIT : 0,
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, avatarUrl: true, topic: true },
    }),
    db.shop.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: PREVIEW_LIMIT,
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, bannerUrl: true },
    }),
    db.product.findMany({
      where: {
        archivedAt: null,
        OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }],
      },
      take: PREVIEW_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        priceCents: true,
        currency: true,
        shop: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({ users, groups, shops, products });
}
