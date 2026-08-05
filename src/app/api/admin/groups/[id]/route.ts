import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Admin moderation delete for a group -- distinct from any owner-only
// delete path, since this one has no ownership check at all.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const group = await db.group.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  await db.group.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
