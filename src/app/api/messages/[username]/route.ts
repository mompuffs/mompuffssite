import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isBlockedEitherWay } from "@/lib/relationships";

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const otherUser = await db.user.findUnique({
    where: { username: params.username.toLowerCase() },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  if (!otherUser) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const messages = await db.message.findMany({
    where: {
      OR: [
        { senderId: user.id, recipientId: otherUser.id },
        { senderId: otherUser.id, recipientId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  await db.message.updateMany({
    where: { senderId: otherUser.id, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ otherUser, messages });
}

export async function POST(req: Request, { params }: { params: { username: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { body } = await req.json();
  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  }

  const otherUser = await db.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!otherUser) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (otherUser.id === user.id) {
    return NextResponse.json({ error: "You can't message yourself." }, { status: 400 });
  }

  if (await isBlockedEitherWay(user.id, otherUser.id)) {
    return NextResponse.json({ error: "You can't message this user." }, { status: 403 });
  }

  const message = await db.message.create({
    data: { senderId: user.id, recipientId: otherUser.id, body: body.trim().slice(0, 5000) },
  });

  return NextResponse.json(message, { status: 201 });
}
