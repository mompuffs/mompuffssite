import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { body } = await req.json();
  if (!body || !String(body).trim()) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }

  const comment = await db.comment.create({
    data: { postId: params.id, authorId: user.id, body: String(body).trim() },
    include: { author: { select: { username: true, displayName: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
