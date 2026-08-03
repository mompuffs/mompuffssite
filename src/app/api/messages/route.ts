import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Conversations are derived from the flat Message table, grouped by whoever
// the current user was messaging -- there's no separate Conversation model.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const messages = await db.message.findMany({
    where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      recipient: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const conversations = new Map<
    string,
    { otherUser: (typeof messages)[number]["sender"]; lastMessage: (typeof messages)[number]; unreadCount: number }
  >();

  for (const m of messages) {
    const otherUser = m.senderId === user.id ? m.recipient : m.sender;
    const existing = conversations.get(otherUser.id);
    const isUnreadForMe = m.recipientId === user.id && !m.readAt;
    if (!existing) {
      conversations.set(otherUser.id, { otherUser, lastMessage: m, unreadCount: isUnreadForMe ? 1 : 0 });
    } else if (isUnreadForMe) {
      existing.unreadCount += 1;
    }
  }

  return NextResponse.json(Array.from(conversations.values()));
}
