import { ImportableProduct, PodAdapter, PodCredentials } from "./types";
import { stripHtml } from "./html";

function shopDomain(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .replace(/\/admin.*$/i, "");
}

export const shopifyAdapter: PodAdapter = {
  id: "SHOPIFY",
  label: "Shopify",
  fields: [
    { key: "apiKey", label: "Admin API access token", placeholder: "shpat_..." },
    { key: "shopDomain", label: "Shop domain", placeholder: "your-store.myshopify.com" },
  ],

  isConfigured(creds) {
    return Boolean(creds.apiKey && creds.shopDomain);
  },

  async listProducts(creds: PodCredentials): Promise<ImportableProduct[]> {
    const domain = shopDomain(creds.shopDomain || "");
    const token = creds.apiKey || "";
    if (!domain || !token) {
      throw new Error("Shopify isn't connected. Add your shop domain and Admin API access token in Connections.");
    }

    const res = await fetch(`https://${domain}/admin/api/2024-10/products.json?limit=50`, {
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Shopify API error (${res.status}): ${text || res.statusText}`);
    }
    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];

    return products.map((p: any) => {
      const variants = (p.variants || []).map((v: any) => ({
        externalId: String(v.id),
        label: v.title && v.title !== "Default Title" ? v.title : p.title,
        priceCents: v.price ? Math.round(parseFloat(v.price) * 100) : 0,
        currency: "USD",
        isAvailable: v.inventory_quantity == null || v.inventory_quantity > 0,
        imageUrl: p.images?.[0]?.src,
      }));
      const images = (p.images || []).map((img: any) => img.src).filter(Boolean);
      return {
        externalId: String(p.id),
        title: p.title,
        description: stripHtml(p.body_html),
        imageUrl: images[0],
        images,
        priceCents: variants[0]?.priceCents ?? 0,
        currency: "USD",
        variants,
        raw: p,
        categoryHint: p.product_type ? [p.product_type] : undefined,
      };
    });
  },
};
