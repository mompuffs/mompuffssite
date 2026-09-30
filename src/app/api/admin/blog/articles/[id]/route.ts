import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { pushArticle } from "@/lib/socrates";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = ["dek", "tldr", "metaTitle", "metaDescription", "heroImage", "heroAlt", "author"] as const;

// Saves the edit page. Content goes to Socrates first (two-way sync) so the
// two copies can't silently drift:
//   - Socrates accepted it  -> save locally with Socrates' new updatedAt
//   - Socrates has a newer edit (409) -> save nothing; the page offers
//     "Overwrite Socrates" (force) or "Pull latest"
//   - Socrates unreachable  -> save locally and record syncError, so the
//     page shows the article as out of sync with a retry
// Category and visibility are mompuffs-only and never sent.
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

  if (!article.socratesId) {
    await db.blogArticle.update({ where: { id: article.id }, data: local });
    return NextResponse.json({ ok: true, synced: false });
  }

  const pushed = await pushArticle(next, body.force === true);
  if (!pushed.ok && pushed.conflict) {
    return NextResponse.json(
      { error: pushed.error, conflict: true, socratesUpdatedAt: pushed.post.updatedAt },
      { status: 409 },
    );
  }
  if (!pushed.ok) {
    await db.blogArticle.update({ where: { id: article.id }, data: { ...local, syncError: pushed.error } });
    return NextResponse.json({ ok: true, synced: false, syncError: pushed.error });
  }

  await db.blogArticle.update({
    where: { id: article.id },
    data: {
      ...local,
      socratesUpdatedAt: new Date(pushed.post.updatedAt),
      lastSyncedAt: new Date(),
      syncError: null,
    },
  });
  return NextResponse.json({ ok: true, synced: true });
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
