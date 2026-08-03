import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json([]);

  const categories = await db.category.findMany({
    where: { shopId: shop.id },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true },
  });
  return NextResponse.json(categories);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const { name, parentId } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (parentId) {
    const parent = await db.category.findUnique({ where: { id: parentId } });
    if (!parent || parent.shopId !== shop.id) {
      return NextResponse.json({ error: "Parent category not found." }, { status: 400 });
    }
  }

  const baseSlug = slugify(String(name).trim());
  let slug = baseSlug;
  let n = 1;
  while (await db.category.findUnique({ where: { shopId_slug: { shopId: shop.id, slug } } })) {
    n++;
    slug = `${baseSlug}-${n}`;
  }

  const category = await db.category.create({
    data: { name: String(name).trim(), slug, parentId: parentId || undefined, shopId: shop.id },
  });

  return NextResponse.json(category, { status: 201 });
}
