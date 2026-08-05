import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  await db.user.update({
    where: { id: (user as any).id },
    data: { lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
