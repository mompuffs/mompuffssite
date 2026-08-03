import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/session";

const MAX_SIZE = 20 * 1024 * 1024;

// The browser uploads the file bytes straight to Blob storage -- this route
// only hands out a short-lived signed token first. Routing the file itself
// through our own serverless function would hit Vercel's ~4.5MB request body
// limit (that's what was causing "Upload failed." on larger images like a
// full-resolution logo export).
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Not authenticated.");

        return {
          allowedContentTypes: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"],
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Upload failed." }, { status: 400 });
  }
}
