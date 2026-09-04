import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isReactionId } from "@/lib/reactions";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const emoji = typeof body.emoji === "string" && isReactionId(body.emoji) ? body.emoji : "like";

  const existing = await db.like.findUnique({
    where: { postId_userId: { postId: params.id, userId: user.id } },
  });

  let mine: string | null = emoji;
  if (existing && existing.emoji === emoji) {
    await db.like.delete({ where: { id: existing.id } });
    mine = null;
  } else if (existing) {
    await db.like.update({ where: { id: existing.id }, data: { emoji } });
  } else {
    await db.like.create({ data: { postId: params.id, userId: user.id, emoji } });
  }

  const likes = await db.like.findMany({ where: { postId: params.id }, select: { emoji: true } });
  const counts: Record<string, number> = {};
  for (const like of likes) {
    const key = like.emoji || "like";
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return NextResponse.json({ mine, counts });
}
