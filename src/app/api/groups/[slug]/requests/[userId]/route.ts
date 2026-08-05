import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request, { params }: { params: { slug: string; userId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const group = await db.group.findUnique({ where: { slug: params.slug } });
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (group.ownerId !== (user as any).id) {
    return NextResponse.json({ error: "Only the group owner can manage join requests." }, { status: 403 });
  }

  const { action } = await req.json();
  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'approve' or 'decline'." }, { status: 400 });
  }

  const membership = await db.groupMembership.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: params.userId } },
  });
  if (!membership || membership.status !== "PENDING") {
    return NextResponse.json({ error: "No pending request for that user." }, { status: 404 });
  }

  if (action === "approve") {
    await db.groupMembership.update({ where: { id: membership.id }, data: { status: "ACTIVE" } });
  } else {
    await db.groupMembership.delete({ where: { id: membership.id } });
  }

  return NextResponse.json({ ok: true });
}
