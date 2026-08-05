import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const group = await db.group.findUnique({ where: { slug: params.slug } });
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const existing = await db.groupMembership.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: (user as any).id } },
  });
  if (existing?.status === "ACTIVE") {
    return NextResponse.json({ error: "You're already a member." }, { status: 409 });
  }
  if (existing?.status === "PENDING") {
    return NextResponse.json({ error: "Your request is already pending." }, { status: 409 });
  }

  const status = group.joinPolicy === "APPROVAL" ? "PENDING" : "ACTIVE";
  const membership = await db.groupMembership.create({
    data: { groupId: group.id, userId: (user as any).id, status },
  });

  return NextResponse.json({ status: membership.status }, { status: 201 });
}
