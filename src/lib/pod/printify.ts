import { ImportableProduct, PodAdapter } from "./types";
import { stripHtml } from "./html";

// Printify REST API v1. Docs: https://developers.printify.com/docs/
// Auth: Bearer token (Personal Access Token from My Profile > Connections),
// plus a required User-Agent header on every request.
const BASE_URL = "https://api.printify.com/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}`,
    "User-Agent": "mompuffs-app",
    "Content-Type": "application/json",
  };
}

export const printifyAdapter: PodAdapter = {
  id: "PRINTIFY",
  label: "Printify",

  isConfigured() {
    return Boolean(process.env.PRINTIFY_API_KEY && process.env.PRINTIFY_SHOP_ID);
  },

  async listProducts(): Promise<ImportableProduct[]> {
    if (!this.isConfigured()) {
      throw new Error(
        "Printify isn't configured. Set PRINTIFY_API_KEY and PRINTIFY_SHOP_ID in your .env.local."
      );
    }

    const shopId = process.env.PRINTIFY_SHOP_ID;
    const res = await fetch(`${BASE_URL}/shops/${shopId}/products.json?limit=25`, {
      headers: headers(),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Printify API error (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    const products = Array.isArray(data?.data) ? data.data : [];

    return products.map((p: any) => {
      const optionDefs = Array.isArray(p.options) ? p.options : [];
      const images = Array.isArray(p.images) ? p.images : [];

      // Printify variants reference their option values (e.g. Color, Size) by
      // numeric ID; resolve those back to readable names via product.options.
      function resolveOptions(variant: any): Record<string, string> {
        const valueIds: number[] = Array.isArray(variant.options) ? variant.options : [];
        const resolved: Record<string, string> = {};
        for (const def of optionDefs) {
          const match = (def.values || []).find((v: any) => valueIds.includes(v.id));
          if (match) resolved[def.name] = match.title;
        }
        return resolved;
      }

      // Each catalog image lists which variant IDs it depicts (usually one per
      // color). Prefer whichever of those Printify itself flags as the
      // representative shot (is_default) rather than just the first match --
      // some designs are back-print only, so "first in array" can land on a
      // blank front angle instead of the one showing the actual print.
      function resolveImage(variant: any): string | undefined {
        const matches = images.filter(
          (img: any) => Array.isArray(img.variant_ids) && img.variant_ids.includes(variant.id)
        );
        if (matches.length === 0) return undefined;
        return (matches.find((img: any) => img.is_default) ?? matches[0]).src;
      }

      // Printify variant "price" is already in cents.
      const enabledVariants = Array.isArray(p.variants) ? p.variants.filter((v: any) => v.is_enabled) : [];
      const variants = enabledVariants.map((v: any) => {
        const options = resolveOptions(v);
        const optionLabel = Object.values(options).join(" / ");
        return {
          externalId: String(v.id),
          label: optionLabel || v.title || "Default",
          priceCents: v.price ?? 0,
          currency: "USD",
          isAvailable: v.is_available !== false,
          imageUrl: resolveImage(v),
          options,
        };
      });

      const defaultImage = images.find((img: any) => img.is_default)?.src ?? images[0]?.src;

      return {
        externalId: String(p.id),
        title: p.title,
        description: stripHtml(p.description),
        imageUrl: defaultImage,
        priceCents: variants[0]?.priceCents ?? 0,
        currency: "USD",
        variants,
        raw: p,
      };
    });
  },
};
