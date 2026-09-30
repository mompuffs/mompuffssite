import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = ["dek", "tldr", "metaTitle", "metaDescription", "heroImage", "heroAlt", "author"] as const;

// Saves the edit page on mompuffs only. Socrates is where articles are
// written: its next send, an import, or Pull latest replaces the content
// fields here. Category and visibility are mompuffs-only and always kept.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const article = await db.blogArticle.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : article.title;
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const next = { ...article, title };
  if (typeof body.body === "string") next.body = body.body;
  for (const f of TEXT_FIELDS) {
    if (typeof body[f] === "string") next[f] = body[f].trim() || null;
  }
  if (Array.isArray(body.tags)) {
    next.tags = body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean);
  }
  if (body.status === "PUBLISHED" || body.status === "HIDDEN") next.status = body.status;
  if (body.categoryId !== undefined) {
    if (body.categoryId === null || body.categoryId === "") next.categoryId = null;
    else {
      const cat = await db.blogCategory.findUnique({ where: { id: String(body.categoryId) }, select: { id: true } });
      if (!cat) return NextResponse.json({ error: "Category not found." }, { status: 400 });
      next.categoryId = cat.id;
    }
  }

  const local = {
    title: next.title,
    body: next.body,
    dek: next.dek,
    tldr: next.tldr,
    metaTitle: next.metaTitle,
    metaDescription: next.metaDescription,
    heroImage: next.heroImage,
    heroAlt: next.heroAlt,
    author: next.author,
    tags: next.tags,
    status: next.status,
    categoryId: next.categoryId,
  };

  await db.blogArticle.update({ where: { id: article.id }, data: local });
  return NextResponse.json({ ok: true });
}

// Removes the article from mompuffs only; the Socrates original is untouched
// (and would come back on the next import or edit there).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const article = await db.blogArticle.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  await db.blogArticle.delete({ where: { id: article.id } });
  return NextResponse.json({ ok: true });
}
