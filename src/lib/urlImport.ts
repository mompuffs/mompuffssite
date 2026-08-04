import dns from "node:dns/promises";
import { ImportableProduct } from "@/lib/pod/types";
import { stripHtml } from "@/lib/pod/html";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 3_000_000;

function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("::ffff:127.")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  return false;
}

// Blocks requests to loopback/private/link-local addresses -- both by
// hostname and by resolving DNS first, so a public hostname that resolves to
// an internal IP (DNS rebinding) is caught too. This lets sellers point the
// importer at arbitrary public storefronts without it being usable to probe
// internal network addresses.
async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Not a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are supported.");
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "0.0.0.0") {
    throw new Error("That URL isn't allowed.");
  }
  if (isPrivateIp(hostname)) {
    throw new Error("That URL isn't allowed.");
  }
  try {
    const { address } = await dns.lookup(hostname);
    if (isPrivateIp(address)) {
      throw new Error("That URL isn't allowed.");
    }
  } catch (e: any) {
    if (e?.message === "That URL isn't allowed.") throw e;
    throw new Error("Couldn't resolve that domain.");
  }
  return url;
}

async function fetchTextCapped(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MompuffsImportBot/1.0; +https://mompuffs.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`Request failed (${res.status}).`);
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) {
      throw new Error("That URL didn't return a web page.");
    }
    if (!res.body) return await res.text();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    let out = "";
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      out += decoder.decode(value, { stream: true });
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
    return out;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Timed out fetching that page.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonLdProductNodes(html: string): any[] {
  const nodes: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let parsed: any;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const candidates = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.["@graph"])
        ? parsed["@graph"]
        : [parsed];
    for (const node of candidates) {
      const type = node?.["@type"];
      if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
        nodes.push(node);
      }
    }
  }
  return nodes;
}

// Heuristic for "this is a category/shop page, not a single product page" --
// such pages commonly mark themselves up as a CollectionPage/ItemList, or
// simply list more than one Product node. Used only to give a clearer error
// message when extraction otherwise comes up empty.
function looksLikeListingPage(html: string, productNodeCount: number): boolean {
  if (productNodeCount > 1) return true;
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let parsed: any;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const candidates = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.["@graph"])
        ? parsed["@graph"]
        : [parsed];
    for (const node of candidates) {
      const type = node?.["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (types.includes("CollectionPage") || types.includes("ItemList")) return true;
    }
  }
  return false;
}

function extractMeta(html: string, property: string): string | undefined {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return undefined;
}

function parsePriceCents(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!isFinite(num) || num <= 0) return undefined;
  return Math.round(num * 100);
}

// Fetches a single public product page and extracts what it can from
// schema.org JSON-LD (preferred, most structured) or Open Graph meta tags
// (fallback, widely supported by storefront platforms for social sharing).
// There's no login involved -- only whatever a normal visitor would see.
export async function scrapeProductFromUrl(rawUrl: string): Promise<ImportableProduct> {
  const url = await assertSafeUrl(rawUrl);
  const html = await fetchTextCapped(url.toString());

  const ldNodes = extractJsonLdProductNodes(html);
  const ld = ldNodes[0];

  let title: string | undefined;
  let description: string | undefined;
  let imageUrl: string | undefined;
  let priceCents: number | undefined;
  let currency = "USD";
  let categoryHint: string[] = [];

  if (ld) {
    if (typeof ld.name === "string") title = ld.name;
    if (typeof ld.description === "string") description = ld.description;
    const img = Array.isArray(ld.image) ? ld.image[0] : ld.image;
    imageUrl = typeof img === "string" ? img : img?.url;
    const offers = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
    // Most sites put the price directly on the Offer (offers.price), but some
    // WooCommerce/Yoast setups nest it a level deeper under a
    // priceSpecification (array or single object) instead -- check both.
    const priceSpec = Array.isArray(offers?.priceSpecification)
      ? offers.priceSpecification[0]
      : offers?.priceSpecification;
    priceCents = parsePriceCents(offers?.price ?? offers?.lowPrice ?? priceSpec?.price);
    if (offers?.priceCurrency || priceSpec?.priceCurrency) {
      currency = String(offers?.priceCurrency ?? priceSpec?.priceCurrency);
    }
    if (typeof ld.category === "string") categoryHint = [ld.category];
    else if (Array.isArray(ld.category)) categoryHint = ld.category.filter((c: unknown) => typeof c === "string");
  }

  title = title || extractMeta(html, "og:title");
  description = description || extractMeta(html, "og:description");
  imageUrl = imageUrl || extractMeta(html, "og:image");
  if (priceCents === undefined) {
    priceCents = parsePriceCents(extractMeta(html, "product:price:amount") || extractMeta(html, "og:price:amount"));
  }
  const ogCurrency = extractMeta(html, "product:price:currency") || extractMeta(html, "og:price:currency");
  if (ogCurrency) currency = ogCurrency;

  if (!title) {
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    title = titleTag ? titleTag[1].trim() : undefined;
  }

  if (!title || priceCents === undefined) {
    if (looksLikeListingPage(html, ldNodes.length)) {
      throw new Error("That looks like a shop/category page listing multiple products. Paste a single product's page URL instead.");
    }
    throw new Error(
      "Couldn't find product details on that page. Make sure it's a single product's page (not a shop/category listing), and that the site exposes standard product info."
    );
  }

  return {
    externalId: url.toString(),
    title: (stripHtml(title) || title).trim(),
    description: description ? stripHtml(description) : undefined,
    imageUrl,
    priceCents,
    currency,
    variants: [],
    categoryHint,
    raw: { sourceUrl: url.toString() },
  };
}
