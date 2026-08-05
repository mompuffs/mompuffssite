import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Toggle another user's admin flag. The only mutation exposed here -- no
// generic PATCH-anything-about-a-user, no DELETE -- keeps this endpoint's
// blast radius small.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { isAdmin } = await req.json();
  if (typeof isAdmin !== "boolean") {
    return NextResponse.json({ error: "isAdmin must be a boolean." }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: params.id }, select: { id: true, isAdmin: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Guard against locking everyone out of /admin: refuse to demote the last
  // remaining admin, whether that's someone demoting themselves or another
  // admin demoting them.
  if (target.isAdmin && !isAdmin) {
    const adminCount = await db.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Can't remove the last remaining admin." },
        { status: 400 }
      );
    }
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: { isAdmin },
    select: { id: true, isAdmin: true },
  });

  return NextResponse.json(updated);
}
