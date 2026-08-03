import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Reads straight from the database rather than the session token, which
// only carries what was true at sign-in and can go stale after an edit.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const fresh = await db.user.findUnique({
    where: { id: (user as any).id },
    select: { displayName: true, avatarUrl: true, email: true, username: true },
  });
  if (!fresh) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  return NextResponse.json(fresh);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { displayName, avatarUrl } = await req.json();
  if (displayName !== undefined && (typeof displayName !== "string" || !displayName.trim())) {
    return NextResponse.json({ error: "displayName must be a non-empty string." }, { status: 400 });
  }
  if (avatarUrl !== undefined && typeof avatarUrl !== "string") {
    return NextResponse.json({ error: "avatarUrl must be a string." }, { status: 400 });
  }
  if (displayName === undefined && avatarUrl === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: (user as any).id },
    data: {
      ...(displayName !== undefined ? { displayName: displayName.trim() } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
    },
    select: { displayName: true, avatarUrl: true },
  });

  return NextResponse.json(updated);
}
