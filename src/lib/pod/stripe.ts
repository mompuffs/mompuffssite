import { ImportableProduct, PodAdapter, PodCredentials } from "./types";
import { stripHtml } from "./html";

export const stripeAdapter: PodAdapter = {
  id: "STRIPE",
  label: "Stripe",
  fields: [{ key: "apiKey", label: "Secret key", placeholder: "sk_live_... or sk_test_..." }],

  isConfigured(creds) {
    return Boolean(creds.apiKey);
  },

  async listProducts(creds: PodCredentials): Promise<ImportableProduct[]> {
    const apiKey = creds.apiKey || "";
    if (!apiKey) throw new Error("Stripe isn't connected. Add your secret key in Connections.");

    const headers = { Authorization: `Bearer ${apiKey}` };
    const [prodRes, priceRes] = await Promise.all([
      fetch("https://api.stripe.com/v1/products?limit=50&active=true", { headers, cache: "no-store" }),
      fetch("https://api.stripe.com/v1/prices?limit=100&active=true", { headers, cache: "no-store" }),
    ]);
    if (!prodRes.ok) {
      const text = await prodRes.text().catch(() => "");
      throw new Error(`Stripe API error (${prodRes.status}): ${text || prodRes.statusText}`);
    }
    const productsJson = await prodRes.json();
    const pricesJson = priceRes.ok ? await priceRes.json() : { data: [] };
    const products = Array.isArray(productsJson?.data) ? productsJson.data : [];
    const prices = Array.isArray(pricesJson?.data) ? pricesJson.data : [];
    const pricesByProduct = new Map<string, any[]>();
    for (const price of prices) {
      const pid = typeof price.product === "string" ? price.product : price.product?.id;
      if (!pid) continue;
      const list = pricesByProduct.get(pid) ?? [];
      list.push(price);
      pricesByProduct.set(pid, list);
    }

    return products.map((p: any) => {
      const productPrices = pricesByProduct.get(p.id) ?? [];
      const variants = productPrices.map((price: any) => ({
        externalId: String(price.id),
        label: price.nickname || p.name,
        priceCents: price.unit_amount ?? 0,
        currency: (price.currency || "usd").toUpperCase(),
        isAvailable: price.active !== false,
        imageUrl: p.images?.[0],
      }));
      const fallbackCents = variants[0]?.priceCents ?? 0;
      return {
        externalId: String(p.id),
        title: p.name,
        description: stripHtml(p.description),
        imageUrl: p.images?.[0],
        images: p.images || [],
        priceCents: fallbackCents,
        currency: variants[0]?.currency ?? "USD",
        variants,
        raw: p,
      };
    });
  },
};
