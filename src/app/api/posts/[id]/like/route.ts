import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const existing = await db.like.findUnique({
    where: { postId_userId: { postId: params.id, userId: user.id } },
  });

  if (existing) {
    await db.like.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await db.like.create({ data: { postId: params.id, userId: user.id } });
  return NextResponse.json({ liked: true });
}
