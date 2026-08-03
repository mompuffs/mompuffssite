import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// [id] is the blocked user's id, not the Block row's id.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  await db.block.deleteMany({ where: { blockerId: user.id, blockedId: params.id } });
  return NextResponse.json({ ok: true });
}
