import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const group = await db.group.findUnique({ where: { slug: params.slug } });
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  if (group.ownerId === (user as any).id) {
    return NextResponse.json(
      { error: "As the owner, you can't leave your own group. Delete it instead if you want to close it." },
      { status: 400 }
    );
  }

  await db.groupMembership.deleteMany({ where: { groupId: group.id, userId: (user as any).id } });
  return NextResponse.json({ ok: true });
}
