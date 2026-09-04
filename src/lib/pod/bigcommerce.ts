import { ImportableProduct, PodAdapter, PodCredentials } from "./types";
import { stripHtml } from "./html";

export const bigcommerceAdapter: PodAdapter = {
  id: "BIGCOMMERCE",
  label: "BigCommerce",
  fields: [
    { key: "apiKey", label: "Access token", placeholder: "Store API account token" },
    { key: "storeHash", label: "Store hash", placeholder: "From api.bigcommerce.com/stores/STOREHASH" },
  ],

  isConfigured(creds) {
    return Boolean(creds.apiKey && creds.storeHash);
  },

  async listProducts(creds: PodCredentials): Promise<ImportableProduct[]> {
    const token = creds.apiKey || "";
    const hash = (creds.storeHash || "").trim();
    if (!token || !hash) {
      throw new Error("BigCommerce isn't connected. Add your store hash and access token in Connections.");
    }

    const res = await fetch(
      `https://api.bigcommerce.com/stores/${hash}/v3/catalog/products?include=images,variants&limit=50`,
      {
        headers: { "X-Auth-Token": token, Accept: "application/json" },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`BigCommerce API error (${res.status}): ${text || res.statusText}`);
    }
    const data = await res.json();
    const products = Array.isArray(data?.data) ? data.data : [];

    return products.map((p: any) => {
      const images = (p.images || [])
        .sort((a: any, b: any) => Number(b.is_thumbnail) - Number(a.is_thumbnail))
        .map((img: any) => img.url_standard || img.url_zoom)
        .filter(Boolean);
      const variants = (p.variants || []).map((v: any) => ({
        externalId: String(v.id),
        label: v.sku || p.name,
        priceCents: v.price != null ? Math.round(Number(v.price) * 100) : p.price != null ? Math.round(Number(p.price) * 100) : 0,
        currency: "USD",
        isAvailable: v.inventory_level == null || v.inventory_level > 0,
        imageUrl: images[0],
      }));
      const priceCents =
        variants[0]?.priceCents ?? (p.price != null ? Math.round(Number(p.price) * 100) : 0);
      return {
        externalId: String(p.id),
        title: p.name,
        description: stripHtml(p.description),
        imageUrl: images[0],
        images,
        priceCents,
        currency: "USD",
        variants,
        raw: p,
      };
    });
  },
};
