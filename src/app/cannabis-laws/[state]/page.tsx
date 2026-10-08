import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { stateFromSlug } from "@/lib/directory";
import { asFaq, asSources, heroFit } from "@/lib/blog";
import { pageMeta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import ArticleBody from "@/components/ArticleBody";
import { article, breadcrumbs, faqPage } from "@/lib/structuredData";
import { LAW_HUB_PATH, LAW_STATES, lawArticleSlug, lawLevel, lawPath } from "@/lib/stateLaws";

export const revalidate = 3600;

async function getGuide(stateParam: string) {
  const st = stateFromSlug(stateParam);
  if (!st) return null;
  const a = await db.blogArticle.findFirst({ where: { slug: lawArticleSlug(st.code), status: "PUBLISHED" } });
  return a ? { st, a } : null;
}

export async function generateMetadata({ params }: { params: { state: string } }): Promise<Metadata> {
  const g = await getGuide(params.state);
  if (!g) return { title: "State not found | MomPuffs", robots: { index: false } };
  const { st, a } = g;
  return pageMeta({
    title: `${a.metaTitle ?? a.title} | MomPuffs`,
    description: a.metaDescription ?? a.dek,
    path: lawPath(st.code),
    image: a.heroImage,
    imageAlt: a.heroAlt ?? a.title,
    type: "article",
  });
}

export default async function StateLawPage({ params }: { params: { state: string } }) {
  const g = await getGuide(params.state);
  if (!g) notFound();
  const { st, a } = g;
  const level = lawLevel(st.code);
  const faq = asFaq(a.faq);
  const sources = asSources(a.sources);

  // Previous / next state, alphabetical, for browsing.
  const i = LAW_STATES.findIndex((s) => s.code === st.code);
  const prev = LAW_STATES[i - 1];
  const next = LAW_STATES[i + 1];

  return (
    <article className="bg-white rounded-xl shadow overflow-hidden">
      <JsonLd
        items={[
          article({
            slug: a.slug,
            path: lawPath(st.code),
            title: a.title,
            description: a.metaDescription ?? a.dek,
            heroImage: a.heroImage,
            author: a.author,
            publishedAt: a.publishedAt,
            updatedAt: a.updatedAt,
            tags: a.tags,
            category: "Cannabis Laws by State",
          }),
          faqPage(faq),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Cannabis Laws by State", path: LAW_HUB_PATH },
            { name: st.name },
          ]),
        ]}
      />
      {a.heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.heroImage} alt={a.heroAlt ?? a.title} className={`w-full aspect-[16/9] ${heroFit(a.heroImage)}`} />
      )}
      <div className="p-5 sm:p-8">
        <nav className="text-sm mb-3 flex flex-wrap items-center gap-2">
          <Link href={LAW_HUB_PATH} className="text-brand-600 hover:underline">
            ← All states map
          </Link>
          <span
            className="font-semibold px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: level.color, color: level.text }}
          >
            {level.label}
          </span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight break-words">{a.title}</h1>
        {a.dek && <p className="text-lg text-gray-600 mt-2">{a.dek}</p>}
        {a.author && <p className="text-sm text-gray-400 mt-3">{a.author}</p>}

        <ArticleBody tldr={a.tldr} body={a.body} faq={faq} sources={sources} />

        <nav className="mt-10 pt-5 border-t flex flex-wrap justify-between gap-3 text-sm" aria-label="Other states">
          {prev ? (
            <Link href={lawPath(prev.code)} className="text-brand-600 hover:underline">
              ← {prev.name}
            </Link>
          ) : (
            <span />
          )}
          <Link href={LAW_HUB_PATH} className="text-brand-600 hover:underline">
            All states
          </Link>
          {next ? (
            <Link href={lawPath(next.code)} className="text-brand-600 hover:underline">
              {next.name} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </article>
  );
}
