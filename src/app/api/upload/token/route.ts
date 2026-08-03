import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

// Issues a short-lived upload authorization from our own media server
// (media.mompuffs.com) -- the browser then uploads the file bytes directly
// there, never through this Vercel function, so we never hit Vercel's
// request body size limit.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { kind } = await req.json();
  if (kind !== "image" && kind !== "video") {
    return NextResponse.json({ error: "kind must be 'image' or 'video'." }, { status: 400 });
  }

  const mediaServiceUrl = process.env.MEDIA_SERVICE_URL;
  const internalSecret = process.env.MEDIA_SERVICE_INTERNAL_SECRET;
  if (!mediaServiceUrl || !internalSecret) {
    return NextResponse.json({ error: "Media service isn't configured." }, { status: 500 });
  }

  const res = await fetch(`${mediaServiceUrl}/internal/upload-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Internal-Secret": internalSecret },
    body: JSON.stringify({ userId: (user as any).id, kind }),
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Could not authorize upload." }, { status: 502 });
  }

  const { token, expiresAt } = await res.json();
  return NextResponse.json({ token, expiresAt, uploadUrl: `${mediaServiceUrl}/upload` });
}
