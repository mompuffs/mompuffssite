import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isBlockedEitherWay } from "@/lib/relationships";

const PROFILE_SELECT = { id: true, username: true, displayName: true, avatarUrl: true };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const requests = await db.friendRequest.findMany({
    where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
    include: { sender: { select: PROFILE_SELECT }, receiver: { select: PROFILE_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  const friends = requests
    .filter((r) => r.status === "ACCEPTED")
    .map((r) => (r.senderId === user.id ? r.receiver : r.sender));
  const incomingRequests = requests.filter((r) => r.status === "PENDING" && r.receiverId === user.id);
  const outgoingRequests = requests.filter((r) => r.status === "PENDING" && r.senderId === user.id);

  return NextResponse.json({ friends, incomingRequests, outgoingRequests });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { targetUserId } = await req.json();
  if (!targetUserId || targetUserId === user.id) {
    return NextResponse.json({ error: "Invalid target user." }, { status: 400 });
  }

  if (await isBlockedEitherWay(user.id, targetUserId)) {
    return NextResponse.json({ error: "Can't send a friend request to this user." }, { status: 403 });
  }

  const existing = await db.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: user.id, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: user.id },
      ],
    },
  });
  if (existing) {
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "You're already friends." }, { status: 409 });
    }
    if (existing.status === "PENDING") {
      return NextResponse.json({ error: "A friend request is already pending." }, { status: 409 });
    }
    // Previously declined -- let them try again with a fresh request.
    await db.friendRequest.delete({ where: { id: existing.id } });
  }

  const request = await db.friendRequest.create({
    data: { senderId: user.id, receiverId: targetUserId },
  });
  return NextResponse.json(request, { status: 201 });
}
