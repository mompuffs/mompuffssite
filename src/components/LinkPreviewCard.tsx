"use client";

// Deliberately NOT imported from src/lib/linkPreview.ts -- that module
// pulls in urlImport.ts's server-only `node:dns` lookup (for the SSRF
// guard used when actually *fetching* a preview), which can't be bundled
// into a client component. This is just the same extension check,
// duplicated to keep this file dependency-free of anything server-only.
const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;
function isDirectVideoUrl(url: string): boolean {
  return DIRECT_VIDEO_EXTENSIONS.test(url);
}

export type LinkPreviewData = {
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImageUrl?: string | null;
  linkVideoUrl?: string | null;
  linkSiteName?: string | null;
};

// Renders a post's pulled-in link preview. Video always wins over image
// when both are present (a video URL still usually carries a poster-frame
// og:image too). Neither the <video> nor the <iframe> case autoplays --
// the browser's own controls / the embedded player's own play button is
// what starts it, on the viewer's own click.
export default function LinkPreviewCard({ post }: { post: LinkPreviewData }) {
  if (!post.linkUrl) return null;

  let hostname = post.linkSiteName;
  if (!hostname) {
    try {
      hostname = new URL(post.linkUrl).hostname.replace(/^www\./, "");
    } catch {
      hostname = post.linkUrl;
    }
  }

  return (
    <a
      href={post.linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block border rounded-lg overflow-hidden mb-2 hover:bg-gray-50"
    >
      {post.linkVideoUrl ? (
        isDirectVideoUrl(post.linkVideoUrl) ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={post.linkVideoUrl}
            poster={post.linkImageUrl ?? undefined}
            controls
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-96 bg-black"
          />
        ) : (
          <iframe
            src={post.linkVideoUrl}
            onClick={(e) => e.stopPropagation()}
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            className="w-full aspect-video bg-black border-0"
          />
        )
      ) : (
        post.linkImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.linkImageUrl} alt="" className="w-full max-h-96 object-cover" />
        )
      )}
      {(post.linkTitle || post.linkDescription) && (
        <div className="p-2.5">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide truncate">{hostname}</p>
          {post.linkTitle && <p className="text-sm font-medium text-gray-900 line-clamp-1">{post.linkTitle}</p>}
          {post.linkDescription && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{post.linkDescription}</p>
          )}
        </div>
      )}
    </a>
  );
}
