import { US_STATES, stateFromSlug, stateSlug } from "@/lib/directory";

// The state-by-state cannabis law pages (/cannabis-laws/<state>). The text
// lives in the BlogArticle rows in the "state-by-state-laws" category
// (slug "<state>-cannabis-laws"); these pages are their public home, and
// the old /blog URLs redirect here.

export type LawLevel = "recreational" | "medical" | "limited" | "illegal";

export const LAW_LEVELS: { key: LawLevel; label: string; short: string; color: string; text: string }[] = [
  { key: "recreational", label: "Recreational & medical", short: "Recreational", color: "#2e7d4f", text: "#ffffff" },
  { key: "medical", label: "Medical only", short: "Medical", color: "#8fcf9f", text: "#14361f" },
  { key: "limited", label: "Limited (CBD / low-THC only)", short: "Limited", color: "#eab95a", text: "#3d2a05" },
  { key: "illegal", label: "No legal cannabis", short: "Illegal", color: "#b8a6c2", text: "#2b2030" },
];

// As of the October 2026 review. Update alongside the posts.
const LEVEL_BY_STATE: Record<string, LawLevel> = {
  AK: "recreational", AZ: "recreational", CA: "recreational", CO: "recreational", CT: "recreational",
  DE: "recreational", DC: "recreational", IL: "recreational", ME: "recreational", MD: "recreational",
  MA: "recreational", MI: "recreational", MN: "recreational", MO: "recreational", MT: "recreational",
  NV: "recreational", NJ: "recreational", NM: "recreational", NY: "recreational", OH: "recreational",
  OR: "recreational", RI: "recreational", VT: "recreational", VA: "recreational", WA: "recreational",
  AL: "medical", AR: "medical", FL: "medical", GA: "medical", HI: "medical", KY: "medical",
  LA: "medical", MS: "medical", NE: "medical", NH: "medical", ND: "medical", OK: "medical",
  PA: "medical", SD: "medical", UT: "medical", WV: "medical",
  IA: "limited", IN: "limited", NC: "limited", SC: "limited", TN: "limited", TX: "limited",
  WI: "limited", WY: "limited",
  ID: "illegal", KS: "illegal",
};

export function lawLevel(code: string) {
  const key = LEVEL_BY_STATE[code] ?? "illegal";
  return LAW_LEVELS.find((l) => l.key === key)!;
}

export const LAW_HUB_PATH = "/cannabis-laws";

export function lawPath(code: string) {
  return `${LAW_HUB_PATH}/${stateSlug(code)}`;
}

export function lawArticleSlug(code: string) {
  return `${stateSlug(code)}-cannabis-laws`;
}

// "missouri-cannabis-laws" -> "MO" (undefined for other blog slugs).
export function stateForLawArticle(slug: string) {
  const m = slug.match(/^(.+)-cannabis-laws$/);
  return m ? stateFromSlug(m[1])?.code : undefined;
}

// Where a blog article lives: state-law posts moved to /cannabis-laws.
export function articleHref(slug: string) {
  const code = stateForLawArticle(slug);
  return code ? lawPath(code) : `/blog/${slug}`;
}

export const LAW_STATES = US_STATES.filter((s) => s.code in LEVEL_BY_STATE);
