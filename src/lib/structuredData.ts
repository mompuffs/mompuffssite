import { DAYS, type Hours, stateName } from "@/lib/directory";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

// schema.org JSON-LD builders. Google uses these for rich results (business
// info, product prices, article details, breadcrumbs); AI search engines use
// them to understand what a page is about. Render with <JsonLd />.
//
// Only include what the page itself shows publicly -- e.g. a free listing's
// hidden hours must not leak through here.

type Thing = Record<string, unknown>;

const abs = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

export const ORG_ID = `${SITE_URL}/#organization`;

export function organization(): Thing {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: { "@type": "ImageObject", url: abs("/logo.png"), width: 250, height: 250 },
    description: DEFAULT_DESCRIPTION,
    founder: { "@type": "Person", name: "Mel", description: "Founder of MomPuffs and longtime cannabis activist" },
    email: "info@mompuffs.com",
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "info@mompuffs.com", url: abs("/contact") },
  };
}

export function website(): Thing {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/directory?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbs(items: { name: string; path?: string }[]): Thing {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.path ? { item: abs(it.path) } : {}),
    })),
  };
}

export function itemList(name: string, urls: string[]): Thing {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: urls.length,
    itemListElement: urls.map((u, i) => ({ "@type": "ListItem", position: i + 1, url: abs(u) })),
  };
}

const DAY_NAMES: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function openingHours(hours: Hours): Thing[] {
  const out: Thing[] = [];
  for (const { key } of DAYS) {
    const d = hours[key];
    if (!d) continue;
    if ("closed" in d) {
      out.push({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_NAMES[key], opens: "00:00", closes: "00:00" });
    } else {
      out.push({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_NAMES[key], opens: d.open, closes: d.close });
    }
  }
  return out;
}

export function localBusiness(l: {
  slug: string;
  name: string;
  category: string;
  street: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  about: string;
  hours: Hours | null;
  licenseNumber: string | null;
}): Thing {
  const page = abs(`/directory/${l.slug}`);
  // No schema.org type for a dispensary or smoke shop; Store is the closest
  // fit Google supports. MMJ doctors are medical businesses.
  const type = l.category === "mmj-doctors" ? "MedicalBusiness" : l.category === "fun-stuff" ? "LocalBusiness" : "Store";
  return {
    "@type": type,
    "@id": `${page}#business`,
    name: l.name,
    url: page,
    description: l.about,
    ...(l.imageUrl ? { image: l.imageUrl } : {}),
    address: {
      "@type": "PostalAddress",
      ...(l.street ? { streetAddress: l.street } : {}),
      ...(l.city ? { addressLocality: l.city } : {}),
      addressRegion: l.state,
      ...(l.zip ? { postalCode: l.zip } : {}),
      addressCountry: "US",
    },
    ...(l.lat != null && l.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng } } : {}),
    ...(l.phone ? { telephone: `+1${l.phone.replace(/\D/g, "").slice(-10)}` } : {}),
    ...(l.email ? { email: l.email } : {}),
    ...(l.website ? { sameAs: [l.website] } : {}),
    ...(l.hours ? { openingHoursSpecification: openingHours(l.hours) } : {}),
    ...(l.licenseNumber
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: `${stateName(l.state)} cannabis license`,
            value: l.licenseNumber,
          },
        }
      : {}),
  };
}

export function article(a: {
  slug: string;
  title: string;
  description: string | null;
  heroImage: string | null;
  author: string | null;
  publishedAt: Date;
  updatedAt: Date;
  tags: string[];
  category: string | null;
  path?: string; // defaults to /blog/<slug>
}): Thing {
  const page = abs(a.path ?? `/blog/${a.slug}`);
  return {
    "@type": "BlogPosting",
    "@id": `${page}#article`,
    headline: a.title.slice(0, 110),
    ...(a.description ? { description: a.description } : {}),
    ...(a.heroImage ? { image: [a.heroImage] } : {}),
    datePublished: a.publishedAt.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    author: a.author ? { "@type": "Person", name: a.author } : { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: page,
    ...(a.tags.length ? { keywords: a.tags.join(", ") } : {}),
    ...(a.category ? { articleSection: a.category } : {}),
    inLanguage: "en-US",
  };
}

export function faqPage(faq: { q: string; a: string }[]): Thing | null {
  if (!faq.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function product(p: {
  id: string;
  title: string;
  description: string | null;
  images: string[];
  priceCents: number;
  currency: string;
  shopName: string;
  shopSlug: string;
  variants: { priceCents: number; isAvailable: boolean }[];
}): Thing {
  const page = abs(`/product/${p.id}`);
  const dollars = (c: number) => (c / 100).toFixed(2);
  const available = p.variants.length ? p.variants.some((v) => v.isAvailable) : true;
  const prices = p.variants.length ? p.variants.map((v) => v.priceCents) : [p.priceCents];
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const seller = { "@type": "Organization", name: p.shopName, url: abs(`/shop/${p.shopSlug}`) };
  const availability = available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  return {
    "@type": "Product",
    "@id": `${page}#product`,
    name: p.title,
    sku: p.id,
    url: page,
    ...(p.images.length ? { image: p.images } : {}),
    ...(p.description ? { description: p.description } : {}),
    brand: { "@type": "Brand", name: p.shopName },
    offers:
      low === high
        ? { "@type": "Offer", url: page, price: dollars(low), priceCurrency: p.currency, availability, seller }
        : {
            "@type": "AggregateOffer",
            url: page,
            lowPrice: dollars(low),
            highPrice: dollars(high),
            offerCount: prices.length,
            priceCurrency: p.currency,
            availability,
            seller,
          },
  };
}

// Plain text from HTML/markdown-ish product copy, trimmed to its prose.
export function plainText(s: string | null | undefined, max = 600) {
  const t = (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, t.lastIndexOf(" ", max))}…` : t;
}
