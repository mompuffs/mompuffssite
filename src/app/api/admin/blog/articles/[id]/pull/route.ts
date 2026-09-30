import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { pullFromSocrates } from "@/lib/socrates";

export const dynamic = "force-dynamic";

// Replaces the local content with the current Socrates version.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const article = await db.blogArticle.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  if (!article.socratesId) return NextResponse.json({ error: "This article isn't linked to Socrates." }, { status: 400 });
  try {
    await pullFromSocrates(article);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
