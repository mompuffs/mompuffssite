"use client";

// Shared by ImageInput and VideoInput: get a short-lived upload token from
// our own backend (which knows who's logged in), then upload the file bytes
// directly to media.mompuffs.com from the browser. The file never passes
// through our Vercel functions, so there's no Vercel request-size limit to
// worry about -- the media server handles resizing/transcoding itself.
export async function uploadMedia(
  file: File,
  kind: "image" | "video"
): Promise<{ url: string; thumbnailUrl?: string; duration?: number }> {
  const tokenRes = await fetch("/api/upload/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  if (!tokenRes.ok) {
    const data = await tokenRes.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not start upload.");
  }
  const { token, uploadUrl } = await tokenRes.json();

  const formData = new FormData();
  formData.append("token", token);
  formData.append("file", file);

  const uploadRes = await fetch(uploadUrl, { method: "POST", body: formData });
  if (!uploadRes.ok) {
    const data = await uploadRes.json().catch(() => ({}));
    throw new Error(data.error ?? "Upload failed.");
  }
  return uploadRes.json();
}
