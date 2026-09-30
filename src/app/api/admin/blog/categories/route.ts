import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { blogSlugify, uniqueBlogCategorySlug } from "@/lib/blog";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
  const base = blogSlugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : name);
  if (!base) return NextResponse.json({ error: "Name needs at least one letter or number." }, { status: 400 });

  const category = await db.blogCategory.create({
    data: { name, description, slug: await uniqueBlogCategorySlug(base) },
  });
  return NextResponse.json({ category });
}
