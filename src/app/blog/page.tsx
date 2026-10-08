import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { pageMeta } from "@/lib/seo";
import { BLOG_PER_PAGE, inBlogCategory, parseSort } from "@/lib/blog";

const STATE_LAWS_SLUG = "state-by-state-laws";
import { pageCount, parsePage } from "@/lib/pagination";
import BlogFilters from "@/components/BlogFilters";
import ProductPagination from "@/components/ProductPagination";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, itemList } from "@/lib/structuredData";
import { heroFit } from "@/lib/blog";
import { LAW_HUB_PATH, articleHref } from "@/lib/stateLaws";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Cannabis News, Recipes & Articles for Moms | MomPuffs Blog",
  description:
    "Cannabis news, recipes, health guides and honest articles for canna-loving women and moms, from the MomPuffs community.",
  path: "/blog",
});

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; sort?: string; page?: string };
}) {
  const q = searchParams.q?.trim() || undefined;
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);

  const where: Prisma.BlogArticleWhereInput = {
    status: "PUBLISHED",
    // A parent category includes its subcategories' articles.
    ...(searchParams.category ? { category: inBlogCategory(searchParams.category) } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { dek: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
            { tags: { has: q } },
          ],
        }
      : {}),
  };

  const [categories, total, articles] = await Promise.all([
    db.blogCategory
      .findMany({
        where: {
          OR: [
            { articles: { some: { status: "PUBLISHED" } } },
            { children: { some: { articles: { some: { status: "PUBLISHED" } } } } },
          ],
        },
        orderBy: { name: "asc" },
        select: { name: true, slug: true, parentId: true, id: true },
      })
      // Parents first, each followed by its subcategories (indented).
      .then((cats) =>
        cats
          .filter((c) => !c.parentId || !cats.some((p) => p.id === c.parentId))
          .flatMap((p) => [
            { name: p.name, slug: p.slug, child: false },
            ...cats.filter((c) => c.parentId === p.id).map((c) => ({ name: c.name, slug: c.slug, child: true })),
          ])
      ),
    db.blogArticle.count({ where }),
    db.blogArticle.findMany({
      where,
      orderBy: { publishedAt: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * BLOG_PER_PAGE,
      take: BLOG_PER_PAGE,
      select: {
        slug: true,
        title: true,
        dek: true,
        heroImage: true,
        heroAlt: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
      },
    }),
  ]);

  // "Jump to your state" grid on the state-law category.
  const stateLaws =
    searchParams.category === STATE_LAWS_SLUG
      ? await db.blogArticle.findMany({
          where: { status: "PUBLISHED", category: { slug: STATE_LAWS_SLUG } },
          orderBy: { title: "asc" },
          select: { slug: true, title: true },
        })
      : [];

  const pages = pageCount(total, BLOG_PER_PAGE);
  const filtered = Boolean(q || searchParams.category);

  return (
    <div>
      <JsonLd
        items={[
          itemList("MomPuffs blog articles", articles.map((a) => `/blog/${a.slug}`)),
          breadcrumbs([{ name: "Home", path: "/" }, { name: "Blog" }]),
        ]}
      />
      <h1 className="text-2xl font-bold mb-4">Blog</h1>

      <BlogFilters
        categories={categories.map((c) => ({ name: c.child ? `  – ${c.name}` : c.name, slug: c.slug }))}
        q={q ?? ""}
        category={searchParams.category ?? ""}
        sort={sort}
      />

      {/* Quick category buttons (same filter as the dropdown). */}
      <nav aria-label="Blog categories" className="flex flex-wrap gap-2 mb-4">
        {[
          { name: "All", slug: "", child: false },
          // State by State Laws always sits last in the row.
          ...categories.filter((c) => c.slug !== STATE_LAWS_SLUG),
          ...categories.filter((c) => c.slug === STATE_LAWS_SLUG),
        ].map((c) => {
          const active = (searchParams.category ?? "") === c.slug;
          const isStateLaws = c.slug === STATE_LAWS_SLUG;
          const qs = new URLSearchParams({ ...(c.slug ? { category: c.slug } : {}), ...(sort === "oldest" ? { sort } : {}) });
          return (
            <Link
              key={c.slug || "all"}
              // The state guides have their own map hub.
              href={isStateLaws ? LAW_HUB_PATH : `/blog${qs.toString() ? `?${qs}` : ""}`}
              className={`text-sm font-semibold px-3 py-1.5 rounded-full border transition ${
                active
                  ? "bg-brand-600 text-white border-brand-600"
                  : isStateLaws
                    ? "bg-green-50 text-green-800 border-green-200 hover:bg-green-100"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-brand-50"
              }`}
            >
              {isStateLaws ? "⚖️ " : ""}
              {c.name}
            </Link>
          );
        })}
      </nav>

      {stateLaws.length > 0 && (
        <section className="bg-white rounded-xl shadow p-4 sm:p-5 mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h2 className="font-bold text-lg">Jump to your state</h2>
            <Link href={LAW_HUB_PATH} className="text-sm text-brand-600 hover:underline">See the map →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1">
            {stateLaws.map((a) => (
              <Link key={a.slug} href={articleHref(a.slug)} className="text-sm text-brand-700 hover:underline py-0.5">
                {a.title.split(" Cannabis Laws")[0]}
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="text-sm text-gray-500 mb-3">
        {total} article{total === 1 ? "" : "s"}
        {filtered && (
          <>
            {" "}·{" "}
            <Link href={sort === "oldest" ? "/blog?sort=oldest" : "/blog"} className="text-brand-600 hover:underline">
              clear filters
            </Link>
          </>
        )}
      </p>

      {articles.length === 0 ? (
        <p className="text-gray-500 bg-white rounded-xl shadow p-6">
          {filtered ? "No articles match those filters." : "No articles yet. Check back soon!"}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={articleHref(a.slug)}
                className="group bg-white rounded-xl shadow overflow-hidden hover:shadow-md transition flex flex-col"
              >
                <div className="aspect-[16/10] bg-brand-100 overflow-hidden">
                  {a.heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.heroImage}
                      alt={a.heroAlt ?? a.title}
                      loading="lazy"
                      className={`w-full h-full ${heroFit(a.heroImage)} group-hover:scale-105 transition duration-300`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📰</div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs mb-2">
                    {a.category ? (
                      <span className="bg-brand-50 text-brand-700 font-medium px-2 py-0.5 rounded-full truncate">
                        {a.category.name}
                      </span>
                    ) : (
                      <span />
                    )}
                    <time className="text-gray-400 shrink-0">{fmt(a.publishedAt)}</time>
                  </div>
                  <h2 className="font-semibold leading-snug group-hover:text-brand-700">{a.title}</h2>
                  {a.dek && <p className="text-sm text-gray-500 mt-1 line-clamp-3">{a.dek}</p>}
                </div>
              </Link>
            ))}
          </div>
          <ProductPagination
            page={Math.min(page, pages)}
            pageCount={pages}
            basePath="/blog"
            query={{ q, category: searchParams.category, sort: sort === "oldest" ? "oldest" : undefined }}
          />
        </>
      )}
    </div>
  );
}
