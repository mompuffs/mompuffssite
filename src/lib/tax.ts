import { db } from "@/lib/db";
import { US_STATE_NAME_TO_CODE, US_COUNTRY_NAME_TO_CODE } from "./usStates";

export type TaxAddress = {
  country?: string;
  state?: string;
  postcode?: string;
  city?: string;
};

function normalize(s: string | undefined | null): string {
  return (s || "").trim().toUpperCase();
}

function normalizeLocation(s: string | undefined | null): string {
  const v = normalize(s);
  return US_STATE_NAME_TO_CODE[v] || US_COUNTRY_NAME_TO_CODE[v] || v;
}

function fieldMatches(pattern: string, value: string): boolean {
  const p = normalize(pattern);
  if (!p || p === "*") return true;
  const v = normalizeLocation(value);
  return p
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((candidate) => (candidate.endsWith("*") ? v.startsWith(candidate.slice(0, -1)) : candidate === v));
}

function rateMatchesAddress(
  rate: { countryCode: string; stateCode: string; postcode: string; city: string },
  address: TaxAddress
): boolean {
  return (
    fieldMatches(rate.countryCode, address.country || "") &&
    fieldMatches(rate.stateCode, address.state || "") &&
    fieldMatches(rate.postcode, address.postcode || "") &&
    fieldMatches(rate.city, address.city || "")
  );
}

export type TaxLine = { taxName: string; rate: number; amountCents: number; shopId: string };

export async function calculateTaxForShop(
  shopId: string,
  subtotalCents: number,
  shippingCents: number,
  address: TaxAddress
): Promise<{ taxCents: number; lines: TaxLine[] }> {
  if (subtotalCents <= 0 && shippingCents <= 0) return { taxCents: 0, lines: [] };

  const allRates = await db.taxRate.findMany({ where: { shopId }, orderBy: { priority: "asc" } });
  const matching = allRates.filter((r) => rateMatchesAddress(r, address));
  if (matching.length === 0) return { taxCents: 0, lines: [] };

  const seenPriorities = new Set<number>();
  const applied = matching.filter((r) => {
    if (seenPriorities.has(r.priority)) return false;
    seenPriorities.add(r.priority);
    return true;
  });

  let taxCents = 0;
  const lines: TaxLine[] = [];
  for (const r of applied) {
    const base = (r.compound ? subtotalCents + taxCents : subtotalCents) + (r.shipping ? shippingCents : 0);
    const amountCents = Math.round(base * (r.rate / 100));
    if (amountCents === 0) continue;
    taxCents += amountCents;
    lines.push({ taxName: r.taxName, rate: r.rate, amountCents, shopId });
  }

  return { taxCents, lines };
}
