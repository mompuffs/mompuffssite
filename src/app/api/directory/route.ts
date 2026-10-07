import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { ADDRESS_NOT_FOUND, locateListing, uniqueListingSlug, validateListingInput } from "@/lib/directoryServer";

export const dynamic = "force-dynamic";

// Member submits a business. It waits for admin approval unless the
// submitter is an admin; admin-added listings also show every field.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit a business." }, { status: 401 });
  const userId = (user as any).id as string;
  const isAdmin = Boolean((user as any).isAdmin);

  if (!isAdmin && !(await checkRateLimit(`directory-submit:${userId}`, 10, 24 * 60 * 60 * 1000))) {
    return NextResponse.json({ error: "You've submitted a lot today. Try again tomorrow." }, { status: 429 });
  }

  const parsed = validateListingInput(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const data = parsed.data;

  const coords = await locateListing(data);
  if (!coords) return NextResponse.json({ error: ADDRESS_NOT_FOUND }, { status: 400 });

  const listing = await db.businessListing.create({
    data: {
      ...data,
      hours: data.hours ?? undefined,
      ...coords,
      slug: await uniqueListingSlug(data.name, data.city ?? "", data.state),
      submittedById: userId,
      status: isAdmin ? "APPROVED" : "PENDING",
      approvedAt: isAdmin ? new Date() : null,
      fullAccess: isAdmin,
    },
    select: { id: true, slug: true, status: true },
  });

  return NextResponse.json(listing, { status: 201 });
}
