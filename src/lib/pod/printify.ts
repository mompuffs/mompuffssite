import { ImportableProduct, PodAdapter } from "./types";

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
      // Printify variant "price" is already in cents.
      const firstVariant = Array.isArray(p.variants) ? p.variants.find((v: any) => v.is_enabled) ?? p.variants[0] : null;
      const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0].src : undefined;

      return {
        externalId: String(p.id),
        title: p.title,
        description: p.description,
        imageUrl: image,
        priceCents: firstVariant?.price ?? 0,
        currency: "USD",
        raw: p,
      };
    });
  },
};
