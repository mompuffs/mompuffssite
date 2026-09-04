import { ImportableProduct, PodAdapter, PodCredentials } from "./types";
import { stripHtml } from "./html";

export const wixAdapter: PodAdapter = {
  id: "WIX",
  label: "Wix",
  fields: [
    { key: "apiKey", label: "API key", placeholder: "Wix Developers API key" },
    { key: "siteId", label: "Site ID", placeholder: "From Wix dashboard site settings" },
  ],

  isConfigured(creds) {
    return Boolean(creds.apiKey && creds.siteId);
  },

  async listProducts(creds: PodCredentials): Promise<ImportableProduct[]> {
    const apiKey = creds.apiKey || "";
    const siteId = creds.siteId || "";
    if (!apiKey || !siteId) {
      throw new Error("Wix isn't connected. Add your API key and Site ID in Connections.");
    }

    const res = await fetch("https://www.wixapis.com/stores/v1/products/query", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "wix-site-id": siteId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { paging: { limit: 50 } } }),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Wix API error (${res.status}): ${text || res.statusText}`);
    }
    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];

    return products.map((p: any) => {
      const imageUrl = p.media?.mainMedia?.image?.url || p.media?.items?.[0]?.image?.url;
      const images = (p.media?.items || []).map((item: any) => item.image?.url).filter(Boolean);
      const price = p.priceData?.price ?? p.price ?? 0;
      const priceCents = Math.round(Number(price) * 100);
      return {
        externalId: String(p.id),
        title: p.name,
        description: stripHtml(p.description),
        imageUrl: imageUrl || images[0],
        images: images.length ? images : imageUrl ? [imageUrl] : [],
        priceCents,
        currency: p.priceData?.currency || "USD",
        variants: [
          {
            externalId: String(p.id),
            label: p.name,
            priceCents,
            currency: p.priceData?.currency || "USD",
            isAvailable: p.stock?.inStock !== false,
            imageUrl: imageUrl || images[0],
          },
        ],
        raw: p,
      };
    });
  },
};
