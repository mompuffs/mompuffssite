import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { blogSlugify, uniqueBlogCategorySlug } from "@/lib/blog";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const existing = await db.blogCategory.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Category not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : existing.name;
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const description =
    typeof body.description === "string" ? body.description.trim() || null : existing.description;
  let slug = existing.slug;
  if (typeof body.slug === "string" && body.slug.trim()) {
    const base = blogSlugify(body.slug);
    if (base && base !== existing.slug) slug = await uniqueBlogCategorySlug(base, existing.id);
  }

  const category = await db.blogCategory.update({
    where: { id: existing.id },
    data: { name, description, slug },
  });
  return NextResponse.json({ category });
}

// Articles in the category are kept and become uncategorized (onDelete: SetNull).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const existing = await db.blogCategory.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  await db.blogCategory.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
