// Business directory (/directory). Categories are fixed here rather than in
// a table -- the slug is what's stored on BusinessListing.category.
export const DIRECTORY_CATEGORIES = [
  { slug: "dispensaries", name: "Dispensaries", icon: "🌿", color: "#16a34a" },
  { slug: "smoke-supplies", name: "Smoke Supplies", icon: "💨", color: "#2563eb" },
  { slug: "mmj-doctors", name: "MMJ Doctors/License", icon: "🩺", color: "#dc2626" },
  { slug: "fun-stuff", name: "Fun Stuff", icon: "🎉", color: "#d97706" },
] as const;

export type DirectoryCategory = (typeof DIRECTORY_CATEGORIES)[number];

export function categoryFor(slug: string | null | undefined): DirectoryCategory | undefined {
  return DIRECTORY_CATEGORIES.find((c) => c.slug === slug);
}

export const DIRECTORY_PER_PAGE = 20;

export const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

export type DayKey = (typeof DAYS)[number]["key"];
export type DayHours = { open: string; close: string } | { closed: true } | null;
export type Hours = Record<DayKey, DayHours>;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Normalizes whatever the form sent into Hours, or null when no day has
// anything set (hours are optional).
export function parseHours(raw: unknown): Hours | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, any>;
  const out = {} as Hours;
  let any = false;
  for (const { key } of DAYS) {
    const d = src[key];
    if (d?.closed) {
      out[key] = { closed: true };
      any = true;
    } else if (d && TIME_RE.test(d.open) && TIME_RE.test(d.close)) {
      out[key] = { open: d.open, close: d.close };
      any = true;
    } else {
      out[key] = null;
    }
  }
  return any ? out : null;
}

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

export function formatDayHours(d: DayHours | undefined) {
  if (!d) return "—";
  if ("closed" in d) return "Closed";
  if (d.open === "00:00" && d.close === "23:59") return "Open 24 hours";
  return `${formatTime(d.open)} – ${formatTime(d.close)}`;
}

export function normalizeUrl(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function formatPhone(p: string) {
  const digits = p.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : p;
}

type AddressParts = { street?: string | null; city?: string | null; state: string; zip?: string | null };

// Street and city are optional, so this joins whatever is there:
// "12 Main St, Denver, CO 80202", "Denver, CO", or just "CO".
export function fullAddress(l: AddressParts) {
  const stateZip = [l.state, l.zip].filter(Boolean).join(" ");
  return [l.street, l.city, stateZip].filter(Boolean).join(", ");
}

// Only meaningful with a street address.
export function directionsUrl(l: AddressParts) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress(l))}`;
}

// ---------- Free vs. premium ----------

export const DIRECTORY_PRICES = {
  MONTHLY: { label: "Monthly", priceCents: 500, display: "$5/month" },
  YEARLY: { label: "Yearly", priceCents: 5000, display: "$50/year" },
} as const;
export type DirectoryPlan = keyof typeof DIRECTORY_PRICES;

export const FREE_FIELDS_LABEL = "logo, address, phone, website and about";
export const PREMIUM_FIELDS_LABEL = "email, hours, specials and menu link";

// Whether a listing's premium fields (email, hours, specials, menu) show
// publicly -- website is a free field: admin-added/comped listings always, otherwise only
// while a claimed owner's subscription has them paid through.
export function listingShowsAll(l: { fullAccess: boolean; premiumUntil: Date | string | null }, now = new Date()) {
  return l.fullAccess || (l.premiumUntil != null && new Date(l.premiumUntil) > now);
}

export const US_STATES: { code: string; name: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["PR", "Puerto Rico"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
].map(([code, name]) => ({ code, name }));

export function stateName(code: string) {
  return US_STATES.find((s) => s.code === code)?.name ?? code;
}

// Once a listing is claimed only its claimer (and admins) can edit it;
// before that, whoever submitted it.
export function canEditListing(
  l: { claimedById: string | null; submittedById: string },
  userId: string | null | undefined,
  isAdmin: boolean
) {
  if (isAdmin) return true;
  if (!userId) return false;
  return l.claimedById ? l.claimedById === userId : l.submittedById === userId;
}

// Wording for page titles/descriptions.
export const CATEGORY_PLURAL: Record<string, string> = {
  dispensaries: "Dispensaries",
  "smoke-supplies": "Smoke & Vape Shops",
  "mmj-doctors": "Medical Marijuana Doctors",
  "fun-stuff": "Cannabis-Friendly Fun",
};
export const CATEGORY_SINGULAR: Record<string, string> = {
  dispensaries: "cannabis dispensary",
  "smoke-supplies": "smoke and vape shop",
  "mmj-doctors": "medical marijuana doctor",
  "fun-stuff": "cannabis-friendly business",
};
