import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const existing = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (existing) return NextResponse.json({ error: "You already have a shop." }, { status: 409 });

  const { name, description, bannerUrl } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Shop name is required." }, { status: 400 });
  }

  let slug = slugify(name);
  let suffix = 0;
  while (await db.shop.findUnique({ where: { slug: suffix ? `${slug}-${suffix}` : slug } })) {
    suffix += 1;
  }
  if (suffix) slug = `${slug}-${suffix}`;

  const shop = await db.shop.create({
    data: { ownerId: user.id, name, slug, description: description || undefined, bannerUrl: bannerUrl || undefined },
  });

  return NextResponse.json(shop, { status: 201 });
}
