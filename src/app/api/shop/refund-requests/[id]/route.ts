import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Approve/deny is a status change only -- see the RefundRequest model
// comment in prisma/schema.prisma. It never touches Stripe/PayPal or the
// order itself; the shop owner still issues the real refund on their own.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "No shop." }, { status: 400 });

  const request = await db.refundRequest.findUnique({ where: { id: params.id } });
  if (!request || request.shopId !== shop.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been responded to." }, { status: 400 });
  }

  const { status, responseNote } = await req.json();
  if (status !== "APPROVED" && status !== "DENIED") {
    return NextResponse.json({ error: "status must be APPROVED or DENIED." }, { status: 400 });
  }
  const note = String(responseNote || "").trim();
  if (note.length > 2000) return NextResponse.json({ error: "That note is too long." }, { status: 400 });

  const updated = await db.refundRequest.update({
    where: { id: params.id },
    data: { status, responseNote: note || undefined, respondedAt: new Date() },
  });

  return NextResponse.json(updated);
}
