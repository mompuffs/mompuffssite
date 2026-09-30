import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma, type BlogArticle } from "@prisma/client";
import { db } from "@/lib/db";
import { blogSlugify, uniqueBlogCategorySlug } from "@/lib/blog";

// Two-way sync with Socrates (the socrates-standalone content desk).
//
//   Socrates -> mompuffs:
//     - Socrates POSTs the signed `post.published` payload to
//       /api/blog/socrates when an article is published, and again whenever a
//       published article is edited there (receiver: handleIncomingPost).
//     - The admin "Import from Socrates" button / per-article "Pull latest"
//       read GET <SOCRATES_URL>/api/feed/<siteId> with the feed key.
//   mompuffs -> Socrates:
//     - Saving on /admin/blog/[id] PATCHes <SOCRATES_URL>/api/feed/<siteId>
//       with the same feed key (pushArticle). Socrates doesn't re-send the
//       result back, so the round trip can't loop.
//
// Env: SOCRATES_URL, SOCRATES_SITE_ID, SOCRATES_FEED_KEY (from the profile
// form in Socrates), SOCRATES_WEBHOOK_SECRET (the profile's webhook secret).

export const DEFAULT_SOCRATES_URL = "https://socsa.innovativeonlinesolution.com";

export function socratesConfig() {
  return {
    url: (process.env.SOCRATES_URL || DEFAULT_SOCRATES_URL).replace(/\/+$/, ""),
    siteId: process.env.SOCRATES_SITE_ID || "",
    feedKey: process.env.SOCRATES_FEED_KEY || "",
    webhookSecret: process.env.SOCRATES_WEBHOOK_SECRET || "",
  };
}

export function socratesEditUrl(socratesId: string) {
  return `${socratesConfig().url}/admin/blog/${socratesId}`;
}

// The `post` object of Socrates' PublishWebhookPayload (feed items also carry
// a rendered `html`, which we don't need -- we render the markdown ourselves
// so local edits and incoming ones render the same way).
export type SocratesPost = {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  tldr: string | null;
  body: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  pillar: string | null;
  tags: string[];
  faq: { q: string; a: string }[] | null;
  sources: { title: string; url: string }[] | null;
  heroImage: string | null;
  heroAlt: string | null;
  author: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export function verifySocratesSignature(raw: string, header: string | null) {
  const secret = socratesConfig().webhookSecret;
  if (!secret || !header) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const SMALL_WORDS = new Set(["and", "or", "of", "the", "a", "an", "for", "in", "on", "to"]);

// "news-and-updates" -> "News and Updates"
function pillarName(pillar: string) {
  return pillar
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

async function categoryForPillar(pillar: string | null) {
  if (!pillar) return null;
  const slug = blogSlugify(pillar);
  if (!slug) return null;
  const existing = await db.blogCategory.findUnique({ where: { slug } });
  if (existing) return existing.id;
  const created = await db.blogCategory.create({
    data: { name: pillarName(pillar), slug: await uniqueBlogCategorySlug(slug) },
  });
  return created.id;
}

async function freeArticleSlug(base: string, exceptId?: string) {
  let slug = base || "article";
  let n = 1;
  for (;;) {
    const hit = await db.blogArticle.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
    n++;
    slug = `${base}-${n}`;
  }
}

function contentFields(p: SocratesPost) {
  return {
    title: p.title,
    dek: p.dek,
    tldr: p.tldr,
    body: p.body ?? "",
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    heroImage: p.heroImage,
    heroAlt: p.heroAlt,
    author: p.author,
    tags: p.tags ?? [],
    faq: p.faq ?? Prisma.JsonNull,
    sources: p.sources ?? Prisma.JsonNull,
  };
}

// Creates or updates the local copy of a Socrates article. Matches on
// socratesId first, then on slug (an article imported before it had a
// socratesId). The admin's category and visibility choices are kept on
// update; the pillar only picks the category of a brand-new article.
export async function upsertFromSocrates(p: SocratesPost, siteId: string) {
  const existing =
    (await db.blogArticle.findUnique({ where: { socratesId: p.id } })) ??
    (await db.blogArticle.findFirst({ where: { slug: p.slug, socratesId: null } }));

  const sync = {
    socratesId: p.id,
    socratesSiteId: siteId,
    socratesSlug: p.slug,
    socratesPillar: p.pillar,
    socratesUpdatedAt: new Date(p.updatedAt),
    lastSyncedAt: new Date(),
    syncError: null,
  };
  const content = contentFields(p);

  if (existing) {
    const updated = await db.blogArticle.update({
      where: { id: existing.id },
      data: { ...content, ...sync },
    });
    return { article: updated, created: false };
  }

  const created = await db.blogArticle.create({
    data: {
      ...content,
      ...sync,
      slug: await freeArticleSlug(p.slug),
      categoryId: await categoryForPillar(p.pillar),
      publishedAt: p.publishedAt ? new Date(p.publishedAt) : new Date(),
    },
  });
  return { article: created, created: true };
}

async function feedFetch(path: string, init?: RequestInit) {
  const cfg = socratesConfig();
  if (!cfg.siteId || !cfg.feedKey) {
    throw new Error("Socrates isn't configured (SOCRATES_SITE_ID / SOCRATES_FEED_KEY).");
  }
  return fetch(`${cfg.url}/api/feed/${encodeURIComponent(cfg.siteId)}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${cfg.feedKey}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
}

async function errorText(res: Response) {
  try {
    const j = await res.json();
    return j.error || `Socrates answered ${res.status}.`;
  } catch {
    return `Socrates answered ${res.status}.`;
  }
}

// Pulls every published article from the Socrates feed (newest 200).
export async function importAllFromSocrates() {
  const res = await feedFetch("?limit=200");
  if (!res.ok) throw new Error(await errorText(res));
  const data = (await res.json()) as { posts: SocratesPost[] };
  let created = 0;
  let updated = 0;
  for (const p of data.posts) {
    const r = await upsertFromSocrates(p, socratesConfig().siteId);
    if (r.created) created++;
    else updated++;
  }
  return { created, updated, total: data.posts.length };
}

// Re-reads one article from Socrates (the feed looks articles up by slug).
export async function pullFromSocrates(article: BlogArticle) {
  const slug = article.socratesSlug || article.slug;
  const res = await feedFetch(`?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(await errorText(res));
  const data = (await res.json()) as { post: SocratesPost };
  if (data.post.id !== article.socratesId) throw new Error("Socrates returned a different article.");
  return upsertFromSocrates(data.post, socratesConfig().siteId);
}

export type PushResult =
  | { ok: true; post: SocratesPost }
  | { ok: false; conflict: true; error: string; post: SocratesPost }
  | { ok: false; conflict: false; error: string };

// Sends the article's editable content to Socrates. `force` skips the
// expectedUpdatedAt check (the admin chose to overwrite a newer Socrates edit).
export async function pushArticle(article: BlogArticle, force = false): Promise<PushResult> {
  if (!article.socratesId) return { ok: false, conflict: false, error: "This article isn't linked to Socrates." };
  let res: Response;
  try {
    res = await feedFetch("", {
      method: "PATCH",
      body: JSON.stringify({
        id: article.socratesId,
        expectedUpdatedAt: force ? undefined : article.socratesUpdatedAt?.toISOString(),
        title: article.title,
        dek: article.dek,
        tldr: article.tldr,
        body: article.body,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        heroImage: article.heroImage,
        heroAlt: article.heroAlt,
        author: article.author,
        tags: article.tags,
      }),
    });
  } catch (e) {
    return { ok: false, conflict: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (res.status === 409) {
    const j = await res.json();
    return { ok: false, conflict: true, error: j.error, post: j.post };
  }
  if (!res.ok) return { ok: false, conflict: false, error: await errorText(res) };
  const j = (await res.json()) as { post: SocratesPost };
  return { ok: true, post: j.post };
}
