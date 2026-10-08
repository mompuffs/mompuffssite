import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { DIRECTORY_CATEGORIES, US_STATES } from "@/lib/directory";
import ProductCard from "@/components/ProductCard";
import { DEFAULT_TITLE, pageMeta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { organization, website } from "@/lib/structuredData";

// Public home page. Browsing (directory, marketplace, blog) is open to
// everyone; the community side (feed, groups, members, messages) needs an
// account -- see src/middleware.ts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({ title: DEFAULT_TITLE, path: "/" });

const COMMUNITY = [
  { icon: "🏠", title: "Your feed", text: "Share posts, photos and videos, react and comment with people who get it." },
  { icon: "👥", title: "Groups", text: "Join public or private groups around strains, recipes, parenting, health and more." },
  { icon: "🤝", title: "Friends", text: "Follow members, add friends and see who's online." },
  { icon: "💬", title: "Private messages", text: "Chat one-on-one, away from the public eye." },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  const [counts, products, articles] = await Promise.all([
    db.businessListing.groupBy({ by: ["category"], where: { status: "APPROVED" }, _count: { _all: true } }),
    db.product.findMany({
      where: { archivedAt: null, imageUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { shop: { select: { name: true, slug: true } } },
    }),
    db.blogArticle.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { slug: true, title: true, dek: true, heroImage: true, heroAlt: true },
    }),
  ]);
  const countFor = (slug: string) => counts.find((c) => c.category === slug)?._count._all ?? 0;
  const totalListings = counts.reduce((n, c) => n + c._count._all, 0);

  const primaryBtn = "inline-block bg-white text-brand-800 font-bold px-5 py-2.5 rounded-full hover:bg-brand-50 transition";
  const ghostBtn = "inline-block border-2 border-white/70 text-white font-bold px-5 py-2 rounded-full hover:bg-white/10 transition";
  const sectionTitle = "text-xl sm:text-2xl font-bold text-brand-900";

  return (
    <div className="space-y-10">
      <JsonLd items={[organization(), website()]} />
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white shadow-lg">
        <div className="px-6 py-10 sm:px-10 sm:py-14 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 min-w-0">
            <p className="uppercase tracking-widest text-xs font-semibold text-brand-200 mb-2">Welcome to Mompuffs</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              A community (mainly) for women who enjoy the canna goodness.
            </h1>
            <p className="mt-4 text-white font-semibold text-lg sm:text-xl max-w-xl">
              Mommy needs a joint should be just as acceptable as Mommy needs a glass of wine!
            </p>
            <p className="mt-2 text-brand-100 text-base sm:text-lg max-w-xl">
              Find dispensaries, smoke shops and other mj oriented businesses near you, explore member shops with unique
              products, catch up on cannabis news/recipes/articles, and connect with other members who get it. No
              algorithms or bots to disturb your visit!
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link href="/feed" className={primaryBtn}>
                    Go to your feed
                  </Link>
                  <Link href="/directory" className={ghostBtn}>
                    Find a dispensary
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className={primaryBtn}>
                    Join free
                  </Link>
                  <Link href="/directory" className={ghostBtn}>
                    Find a dispensary
                  </Link>
                </>
              )}
            </div>
            {!user && (
              <p className="mt-3 text-sm text-brand-200">
                Already a member?{" "}
                <Link href="/login" className="underline font-semibold text-white">
                  Log in
                </Link>
              </p>
            )}
          </div>
          <div className="shrink-0">
            <Image
              src="/logo.png"
              alt="Mompuffs"
              width={250}
              height={250}
              className="rounded-full w-40 h-40 sm:w-52 sm:h-52 lg:w-60 lg:h-60 ring-8 ring-white/15 shadow-2xl"
              priority
            />
          </div>
        </div>
      </section>

      {/* Directory */}
      <section className="bg-white rounded-2xl shadow p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <h2 className={sectionTitle}>Find a spot near you</h2>
            <p className="text-sm text-gray-500">
              {totalListings.toLocaleString()} dispensaries, smoke shops and MMJ doctors across the US.
            </p>
          </div>
          <Link href="/directory" className="text-sm font-semibold text-brand-700 hover:underline">
            Open the map →
          </Link>
        </div>
        <form method="get" action="/directory" className="flex flex-col sm:flex-row gap-2">
          <input
            name="q"
            placeholder="Search by name, city or ZIP"
            className="flex-1 border rounded-lg px-3 py-2.5 text-sm bg-white"
            aria-label="Search the directory"
          />
          <select name="state" defaultValue="" className="border rounded-lg px-3 py-2.5 text-sm bg-white" aria-label="State">
            <option value="">All states</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-700">Search</button>
        </form>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {DIRECTORY_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/directory?category=${c.slug}`}
              className="rounded-xl border border-gray-100 bg-brand-50/50 hover:bg-brand-50 p-3 transition"
            >
              <span className="text-2xl">{c.icon}</span>
              <p className="font-semibold text-sm mt-1" style={{ color: c.color }}>
                {c.name}
              </p>
              <p className="text-xs text-gray-500">{countFor(c.slug).toLocaleString()} listed</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Marketplace */}
      {products.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
            <div>
              <h2 className={sectionTitle}>Fresh from the marketplace</h2>
              <p className="text-sm text-gray-500">Canna-themed apparel, accessories and goods from our member shops.</p>
            </div>
            <Link href="/marketplace" className="text-sm font-semibold text-brand-700 hover:underline">
              Shop all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Blog */}
      {articles.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
            <h2 className={sectionTitle}>From the blog</h2>
            <Link href="/blog" className="text-sm font-semibold text-brand-700 hover:underline">
              All articles →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="group bg-white rounded-xl shadow overflow-hidden hover:shadow-md transition flex flex-col"
              >
                <div className="aspect-[16/10] bg-brand-100 overflow-hidden">
                  {a.heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.heroImage}
                      alt={a.heroAlt ?? a.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📰</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold leading-snug group-hover:text-brand-700">{a.title}</h3>
                  {a.dek && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.dek}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Community (members only) */}
      <section className="rounded-2xl bg-brand-50 border border-brand-100 p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className={sectionTitle}>The community</h2>
            <p className="text-sm text-gray-600">
              {user ? "Everything members can do, a click away." : "Free for members. Sign up to join the conversation."}
            </p>
          </div>
          {user ? (
            <Link href="/feed" className="bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-brand-700">
              Go to your feed
            </Link>
          ) : (
            <Link href="/register" className="bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-brand-700">
              Join free
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COMMUNITY.map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-4 shadow-sm">
              <span className="text-2xl">{f.icon}</span>
              <p className="font-semibold mt-1">{f.title}</p>
              <p className="text-sm text-gray-600 mt-1">{f.text}</p>
            </div>
          ))}
        </div>
        {!user && (
          <p className="text-xs text-gray-500 mt-4">
            🔒 The feed, groups, member profiles and messages are visible to members only.
          </p>
        )}
      </section>
    </div>
  );
}
