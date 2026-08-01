import { ImportableProduct, PodAdapter } from "./types";

// Printful API v1. Docs: https://developers.printful.com/docs/
// Auth: Bearer private token (Developer Portal > Private Token), scoped to one store.
const BASE_URL = "https://api.printful.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export const printfulAdapter: PodAdapter = {
  id: "PRINTFUL",
  label: "Printful",

  isConfigured() {
    return Boolean(process.env.PRINTFUL_API_KEY);
  },

  async listProducts(): Promise<ImportableProduct[]> {
    if (!this.isConfigured()) {
      throw new Error("Printful isn't configured. Set PRINTFUL_API_KEY in your .env.local.");
    }

    const listRes = await fetch(`${BASE_URL}/store/products`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!listRes.ok) {
      const text = await listRes.text().catch(() => "");
      throw new Error(`Printful API error (${listRes.status}): ${text || listRes.statusText}`);
    }
    const listData = await listRes.json();
    const summaries = Array.isArray(listData?.result) ? listData.result.slice(0, 15) : [];

    // The list endpoint doesn't include price, so fetch each product's detail
    // (sync_product + sync_variants) to read retail_price. Capped to keep the
    // request count reasonable for a prototype.
    const detailed = await Promise.all(
      summaries.map(async (summary: any) => {
        const detailRes = await fetch(`${BASE_URL}/store/products/${summary.id}`, {
          headers: headers(),
          cache: "no-store",
        });
        if (!detailRes.ok) return null;
        const detailData = await detailRes.json();
        const syncProduct = detailData?.result?.sync_product;
        const syncVariants = detailData?.result?.sync_variants ?? [];
        const firstVariant = syncVariants[0];

        return {
          externalId: String(summary.id),
          title: syncProduct?.name ?? summary.name,
          imageUrl: syncProduct?.thumbnail ?? summary.thumbnail_url,
          priceCents: firstVariant?.retail_price
            ? Math.round(parseFloat(firstVariant.retail_price) * 100)
            : 0,
          currency: firstVariant?.currency ?? "USD",
          raw: detailData?.result,
        } as ImportableProduct;
      })
    );

    return detailed.filter((p): p is ImportableProduct => p !== null);
  },
};
