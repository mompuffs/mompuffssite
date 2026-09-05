import { assertSafeUrl, extractMeta, fetchTextCapped } from "@/lib/urlImport";

// Keep this well under the post-composer's tolerance for a "hanging"
// submit -- urlImport's own default (10s, for the shop-import flow where a
// slow fetch is expected and tolerated) would make posting a link feel
// broken. A link preview is a nice-to-have, not something worth a long wait.
const PREVIEW_FETCH_TIMEOUT_MS = 6_000;

const URL_RE = /https?:\/\/[^\s<>"']+/i;
// Video file extensions we can drop straight into a <video> tag; anything
// else with a video URL (YouTube/Vimeo/TikTok "og:video" embed links, etc.)
// gets rendered as an <iframe> instead -- see PostCard.tsx.
const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  siteName: string | null;
  /** true = a direct playable video file (<video>); false = an embeddable
   *  player URL (<iframe>, e.g. YouTube). Only meaningful when videoUrl is set. */
  isDirectVideoFile: boolean;
};

/** First http(s) URL found in free text, trimmed of trailing punctuation
 *  that's almost always sentence punctuation rather than part of the URL
 *  (e.g. "check this out: https://example.com/foo." -> drop the "."). */
export function extractFirstUrl(text: string): string | null {
  const m = text.match(URL_RE);
  if (!m) return null;
  return m[0].replace(/[.,!?;:)\]}'"]+$/, "") || null;
}

/** Extension-only check (the og:video:type MIME hint isn't persisted to
 *  the DB) -- used client-side in PostCard.tsx to decide <video> vs
 *  <iframe> for a stored linkVideoUrl. */
export function isDirectVideoUrl(url: string): boolean {
  return DIRECT_VIDEO_EXTENSIONS.test(url);
}

function resolveMaybeRelative(value: string | undefined, base: URL): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}

/** Fetches Open Graph (falling back to Twitter Card / <title>) metadata for
 *  a URL. Never throws -- a broken/slow/blocking source just means no
 *  preview, not a failed post. */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  try {
    const url = await assertSafeUrl(rawUrl);
    const html = await fetchTextCapped(url.toString(), PREVIEW_FETCH_TIMEOUT_MS);

    let title = extractMeta(html, "og:title") || extractMeta(html, "twitter:title");
    if (!title) {
      const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      title = titleTag?.[1]?.trim();
    }
    const description = extractMeta(html, "og:description") || extractMeta(html, "twitter:description");
    const imageUrl = resolveMaybeRelative(
      extractMeta(html, "og:image:secure_url") || extractMeta(html, "og:image") || extractMeta(html, "twitter:image"),
      url
    );
    const videoUrl = resolveMaybeRelative(
      extractMeta(html, "og:video:secure_url") || extractMeta(html, "og:video:url") || extractMeta(html, "og:video"),
      url
    );
    const siteName = extractMeta(html, "og:site_name");

    if (!title && !description && !imageUrl && !videoUrl) return null;

    const videoType = extractMeta(html, "og:video:type");
    const isDirectVideoFile = !!videoUrl && (DIRECT_VIDEO_EXTENSIONS.test(videoUrl) || !!videoType?.startsWith("video/"));

    return {
      url: url.toString(),
      title: title ?? null,
      description: description ?? null,
      imageUrl: imageUrl ?? null,
      videoUrl: videoUrl ?? null,
      siteName: siteName ?? null,
      isDirectVideoFile,
    };
  } catch {
    return null;
  }
}
