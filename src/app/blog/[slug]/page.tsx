import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { lawPath, stateForLawArticle } from "@/lib/stateLaws";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { asFaq, asSources, heroFit } from "@/lib/blog";
import ArticleBody from "@/components/ArticleBody";
import { pageMeta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { article, breadcrumbs, faqPage } from "@/lib/structuredData";

export const dynamic = "force-dynamic";

// Admins can open hidden drafts (with a banner) to review them before publishing.
async function getArticle(slug: string, includeHidden = false) {
  return db.blogArticle.findFirst({
    where: { slug, ...(includeHidden ? {} : { status: "PUBLISHED" }) },
    include: { category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } } },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getArticle(params.slug);
  if (!a) return { title: "Article not found | MomPuffs", robots: { index: false } };
  const base = pageMeta({
    title: `${a.metaTitle ?? a.title} | MomPuffs`,
    description: a.metaDescription ?? a.dek,
    path: `/blog/${a.slug}`,
    image: a.heroImage,
    imageAlt: a.heroAlt ?? a.title,
    type: "article",
  });
  return {
    ...base,
    authors: a.author ? [{ name: a.author }] : undefined,
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: a.publishedAt.toISOString(),
      modifiedTime: a.updatedAt.toISOString(),
      authors: a.author ? [a.author] : undefined,
      tags: a.tags,
    },
  };
}

export default async function BlogArticlePage({ params }: { params: { slug: string } }) {
  // The state-law guides moved out of the blog to /cannabis-laws/<state>.
  const lawState = stateForLawArticle(params.slug);
  if (lawState) permanentRedirect(lawPath(lawState));

  const admin = await getAdminUser();
  const a = await getArticle(params.slug, Boolean(admin));
  if (!a) notFound();

  const faq = asFaq(a.faq);
  const sources = asSources(a.sources);
  const date = a.publishedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <article className="bg-white rounded-xl shadow overflow-hidden">
      {a.status !== "PUBLISHED" && (
        <div className="bg-amber-100 text-amber-900 text-sm font-semibold px-5 py-2">
          Draft: only admins can see this.{" "}
          <Link href={`/admin/blog/${a.id}`} className="underline">
            Edit or publish it
          </Link>
        </div>
      )}
      <JsonLd
        items={[
          article({
            slug: a.slug,
            title: a.title,
            description: a.metaDescription ?? a.dek,
            heroImage: a.heroImage,
            author: a.author,
            publishedAt: a.publishedAt,
            updatedAt: a.updatedAt,
            tags: a.tags,
            category: a.category?.name ?? null,
          }),
          faqPage(faq),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            ...(a.category?.parent ? [{ name: a.category.parent.name, path: `/blog?category=${a.category.parent.slug}` }] : []),
            ...(a.category ? [{ name: a.category.name, path: `/blog?category=${a.category.slug}` }] : []),
            { name: a.title },
          ]),
        ]}
      />
      {a.heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.heroImage} alt={a.heroAlt ?? a.title} className={`w-full aspect-[16/9] ${heroFit(a.heroImage)}`} />
      )}
      <div className="p-5 sm:p-8">
        <nav className="text-sm mb-3 flex flex-wrap items-center gap-2">
          <Link href="/blog" className="text-brand-600 hover:underline">
            ← Blog
          </Link>
          {a.category?.parent && (
            <Link
              href={`/blog?category=${a.category.parent.slug}`}
              className="bg-brand-50 text-brand-700 font-medium px-2 py-0.5 rounded-full text-xs hover:bg-brand-100"
            >
              {a.category.parent.name}
            </Link>
          )}
          {a.category && (
            <Link
              href={`/blog?category=${a.category.slug}`}
              className="bg-brand-50 text-brand-700 font-medium px-2 py-0.5 rounded-full text-xs hover:bg-brand-100"
            >
              {a.category.name}
            </Link>
          )}
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight break-words">{a.title}</h1>
        {a.dek && <p className="text-lg text-gray-600 mt-2">{a.dek}</p>}
        <p className="text-sm text-gray-400 mt-3">
          {a.author ? `${a.author} · ` : ""}
          <time dateTime={a.publishedAt.toISOString()}>{date}</time>
        </p>

        <ArticleBody tldr={a.tldr} body={a.body} faq={faq} sources={sources} />

        {a.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {a.tags.map((t) => (
              <Link
                key={t}
                href={`/blog?q=${encodeURIComponent(t)}`}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-200"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
