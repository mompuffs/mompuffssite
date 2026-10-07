import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

const STATUSES = ["APPROVED", "REJECTED", "PENDING"];

// Admin review: approve, reject (with an optional note the submitter sees)
// or send back to pending.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { status, reviewNote } = await req.json().catch(() => ({}));
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Bad status." }, { status: 400 });

  const listing = await db.businessListing.findUnique({ where: { id: params.id }, select: { approvedAt: true } });
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  await db.businessListing.update({
    where: { id: params.id },
    data: {
      status,
      reviewNote: status === "REJECTED" && typeof reviewNote === "string" ? reviewNote.trim().slice(0, 500) || null : null,
      approvedAt: status === "APPROVED" ? listing.approvedAt ?? new Date() : listing.approvedAt,
    },
  });
  return NextResponse.json({ ok: true });
}
