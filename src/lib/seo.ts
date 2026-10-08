import type { Metadata } from "next";

// Search/social metadata shared by every page. Canonical URLs always use the
// www host (the apex domain 308-redirects there).
export const SITE_URL = "https://www.mompuffs.com";
export const SITE_NAME = "Mompuffs";
export const DEFAULT_TITLE = "Mompuffs | A community for canna-loving women";
export const DEFAULT_DESCRIPTION =
  "Mompuffs is a community (mainly) for women who enjoy cannabis: find dispensaries, smoke shops and MMJ doctors near you, shop member stores, read cannabis news, recipes and articles, and connect with members who get it.";
export const DEFAULT_IMAGE = "/logo.png";

// Trims to a search-snippet-friendly length on a word boundary.
export function clip(text: string | null | undefined, max = 158) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max - 1)).replace(/[,.;:\-–]+$/, "") + "…";
}

export function pageMeta({
  title,
  description,
  path,
  image,
  imageAlt,
  type = "website",
  noindex = false,
}: {
  title: string;
  description?: string | null;
  path?: string;
  image?: string | null;
  imageAlt?: string | null;
  type?: "website" | "article";
  noindex?: boolean;
}): Metadata {
  const desc = clip(description || DEFAULT_DESCRIPTION);
  const images = [{ url: image || DEFAULT_IMAGE, alt: imageAlt || title }];
  return {
    title,
    description: desc,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: { title, description: desc, url: path, siteName: SITE_NAME, type, images },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: desc, images: images.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// For pages that should never appear in search (forms, account areas).
export function privateMeta(title: string): Metadata {
  return { title: `${title} | ${SITE_NAME}`, robots: { index: false, follow: false } };
}
