import dns from "node:dns/promises";
import { ImportableProduct } from "@/lib/pod/types";
import { stripHtml } from "@/lib/pod/html";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 3_000_000;

export function normalizeSourceUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return raw.trim();
  }
}

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

  const sourceUrl = normalizeSourceUrl(url.toString());
  return {
    externalId: sourceUrl,
    title: (stripHtml(title) || title).trim(),
    description: description ? stripHtml(description) : undefined,
    imageUrl,
    priceCents,
    currency,
    variants: [],
    categoryHint,
    raw: { sourceUrl },
  };
}

const MAX_LISTING_PAGES_TO_FOLLOW = 20;
export const MAX_DISCOVER_COUNT = 100;

function extractProductLinks(html: string, baseUrl: URL): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  const re = /<a\s[^>]*href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let resolved: URL;
    try {
      resolved = new URL(m[1], baseUrl);
    } catch {
      continue;
    }
    if (resolved.origin !== baseUrl.origin) continue;
    if (!/\/products?\//i.test(resolved.pathname)) continue;
    resolved.search = "";
    resolved.hash = "";
    const key = normalizeSourceUrl(resolved.toString());
    if (!seen.has(key)) {
      seen.add(key);
      links.push(key);
    }
  }
  return links;
}

function extractNextPageUrl(html: string, baseUrl: URL): URL | null {
  const m =
    html.match(/<a\s[^>]*rel=["']next["'][^>]*href=["']([^"']+)["']/i) ||
    html.match(/<a\s[^>]*href=["']([^"']+)["'][^>]*rel=["']next["']/i);
  if (!m) return null;
  try {
    const resolved = new URL(m[1], baseUrl);
    return resolved.origin === baseUrl.origin ? resolved : null;
  } catch {
    return null;
  }
}

export async function discoverProductUrls(
  rawListingUrl: string,
  maxCount: number,
  skipNormalizedUrls: Set<string> = new Set()
): Promise<string[]> {
  const cappedMax = Math.max(1, Math.min(Math.floor(maxCount) || 1, MAX_DISCOVER_COUNT));
  let currentUrl = await assertSafeUrl(rawListingUrl);
  const found: string[] = [];
  const visitedPages = new Set<string>();

  for (let page = 0; page < MAX_LISTING_PAGES_TO_FOLLOW && found.length < cappedMax; page++) {
    const pageKey = currentUrl.toString();
    if (visitedPages.has(pageKey)) break;
    visitedPages.add(pageKey);

    const html = await fetchTextCapped(pageKey);
    for (const link of extractProductLinks(html, currentUrl)) {
      if (found.length >= cappedMax) break;
      const normalized = normalizeSourceUrl(link);
      if (skipNormalizedUrls.has(normalized)) continue;
      if (!found.includes(normalized)) found.push(normalized);
    }
    if (found.length >= cappedMax) break;

    const nextUrl = extractNextPageUrl(html, currentUrl);
    if (!nextUrl) break;
    currentUrl = await assertSafeUrl(nextUrl.toString());
  }

  if (found.length === 0) {
    throw new Error(
      skipNormalizedUrls.size > 0
        ? "Every product on that page is already in your shop."
        : "Couldn't find any product links on that page."
    );
  }
  return found.slice(0, cappedMax);
}
