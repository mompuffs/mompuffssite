import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "No shop." }, { status: 400 });

  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product || product.shopId !== shop.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json();
  const { categoryIds, description, title } = body;

  if (categoryIds !== undefined && !Array.isArray(categoryIds)) {
    return NextResponse.json({ error: "categoryIds must be an array." }, { status: 400 });
  }
  if (description !== undefined && typeof description !== "string") {
    return NextResponse.json({ error: "description must be a string." }, { status: 400 });
  }
  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return NextResponse.json({ error: "title must be a non-empty string." }, { status: 400 });
  }
  if (categoryIds === undefined && description === undefined && title === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await db.product.update({
    where: { id: params.id },
    data: {
      ...(categoryIds !== undefined ? { categories: { set: categoryIds.map((id: string) => ({ id })) } } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(title !== undefined ? { title: title.trim() } : {}),
    },
    include: { categories: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "No shop." }, { status: 400 });

  const product = await db.product.findUnique({ where: { id: params.id } });
  if (!product || product.shopId !== shop.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await db.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
