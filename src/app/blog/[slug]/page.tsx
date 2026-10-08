import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";
import { asFaq, asSources, renderMarkdown } from "@/lib/blog";
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
  if (!a) return { title: "Article not found | Mompuffs", robots: { index: false } };
  const base = pageMeta({
    title: `${a.metaTitle ?? a.title} | Mompuffs`,
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
        <img src={a.heroImage} alt={a.heroAlt ?? a.title} className="w-full aspect-[16/9] object-cover" />
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

        {a.tldr && (
          <div className="mt-6 bg-brand-50 border-l-4 border-brand-500 rounded p-4 text-sm">
            <p className="font-semibold text-brand-800 mb-1">TL;DR</p>
            <p className="text-gray-700">{a.tldr}</p>
          </div>
        )}

        <div className="blog-prose mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body) }} />

        {faq.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-3">FAQ</h2>
            <div className="space-y-2">
              {faq.map((f, i) => (
                <details key={i} className="border rounded-lg p-3">
                  <summary className="font-medium cursor-pointer">{f.q}</summary>
                  <p className="text-sm text-gray-700 mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {sources.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">Sources</h2>
            <ol className="list-decimal pl-5 text-sm space-y-1">
              {sources.map((s, i) => (
                <li key={i} className="break-words">
                  <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="text-brand-600 hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

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
