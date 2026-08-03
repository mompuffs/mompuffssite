import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { action } = await req.json();
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'accept' or 'decline'." }, { status: 400 });
  }

  const request = await db.friendRequest.findUnique({ where: { id: params.id } });
  if (!request || request.receiverId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been responded to." }, { status: 409 });
  }

  const updated = await db.friendRequest.update({
    where: { id: request.id },
    data: { status: action === "accept" ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
  });
  return NextResponse.json(updated);
}

// Cancels a pending request you sent, or removes an accepted friendship --
// either party can end an accepted friendship.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const request = await db.friendRequest.findUnique({ where: { id: params.id } });
  if (!request || (request.senderId !== user.id && request.receiverId !== user.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (request.status === "PENDING" && request.senderId !== user.id) {
    return NextResponse.json({ error: "Only the sender can cancel a pending request." }, { status: 403 });
  }

  await db.friendRequest.delete({ where: { id: request.id } });
  return NextResponse.json({ ok: true });
}
