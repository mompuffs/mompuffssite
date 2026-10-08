import Link from "next/link";
import { db } from "@/lib/db";
import { pageMeta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import StateLawMap from "@/components/StateLawMap";
import { breadcrumbs, itemList } from "@/lib/structuredData";
import { LAW_HUB_PATH, LAW_LEVELS, LAW_STATES, lawArticleSlug, lawLevel, lawPath } from "@/lib/stateLaws";

// Hourly is plenty: the levels live in code and the pages change rarely.
export const revalidate = 3600;

export const metadata = pageMeta({
  title: "Cannabis Laws by State 2026: Interactive Map | MomPuffs",
  description:
    "Where is weed legal? A color-coded map of cannabis laws in all 50 states and D.C.: recreational, medical only, CBD/low-THC only, or fully illegal, with a plain-English guide for each state.",
  path: LAW_HUB_PATH,
});

export default async function CannabisLawsHub() {
  // Only link states whose guide is published.
  const published = new Set(
    (
      await db.blogArticle.findMany({
        where: { status: "PUBLISHED", category: { slug: "state-by-state-laws" } },
        select: { slug: true },
      })
    ).map((a) => a.slug)
  );
  const states = LAW_STATES.filter((s) => published.has(lawArticleSlug(s.code)));
  const countFor = (key: string) => LAW_STATES.filter((s) => lawLevel(s.code).key === key).length;

  return (
    <div className="space-y-6">
      <JsonLd
        items={[
          itemList(
            "Cannabis laws by state",
            states.map((s) => lawPath(s.code))
          ),
          breadcrumbs([{ name: "Home", path: "/" }, { name: "Cannabis Laws by State" }]),
        ]}
      />

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Cannabis Laws by State (2026)</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">
          Where is weed legal? Tap or click any state on the map, or pick it from the list below, for a plain-English
          guide to what's legal there: how much you can have, home grow, medical cards, taxes, and what's changing.
        </p>
      </header>

      <section className="bg-white rounded-xl shadow p-3 sm:p-5">
        <StateLawMap />
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Map legend">
          {LAW_LEVELS.map((l) => (
            <li key={l.key} className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: l.color }} aria-hidden="true" />
              {l.label} <span className="text-gray-400">({countFor(l.key)})</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-bold mb-3">All states</h2>
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1">
          {states.map((s) => {
            const level = lawLevel(s.code);
            return (
              <li key={s.code}>
                <Link href={lawPath(s.code)} className="flex items-center gap-2 py-1.5 group">
                  <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: level.color }} aria-hidden="true" />
                  <span className="font-medium text-brand-700 group-hover:underline">{s.name}</span>
                  <span className="hidden sm:inline text-xs text-gray-400">{level.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-gray-500 max-w-3xl">
        Federal law still treats adult-use cannabis as illegal everywhere, and federal land (national parks, military
        bases) follows federal rules in every state. Laws change often: each guide shows when we last reviewed it and
        links to its sources. This is general information, not legal advice.
      </p>
    </div>
  );
}
