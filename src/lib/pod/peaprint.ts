import { ImportableProduct, PodAdapter } from "./types";
import { stripHtml } from "./html";

// Peaprint (peaprint.com) advertises an order-automation API on their site,
// but as of writing there is no public developer portal or published
// request/response schema to build against (unlike Printify and Printful).
//
// This adapter is a placeholder: it's wired into the same PodAdapter
// interface as the others so the UI and import flow "just work" once real
// docs/credentials are available. To finish it:
//   1. Get API docs/credentials from Peaprint support.
//   2. Set PEAPRINT_API_KEY and PEAPRINT_API_BASE in .env.local.
//   3. Replace the fetch call below with their real catalog/products endpoint
//      and map the response fields into ImportableProduct.
export const peaprintAdapter: PodAdapter = {
  id: "PEAPRINT",
  label: "Peaprint",

  isConfigured() {
    return Boolean(process.env.PEAPRINT_API_KEY && process.env.PEAPRINT_API_BASE);
  },

  async listProducts(): Promise<ImportableProduct[]> {
    if (!this.isConfigured()) {
      throw new Error(
        "Peaprint isn't configured yet. Peaprint doesn't publish a public API reference " +
          "as of this build -- contact their support for API docs/credentials, then set " +
          "PEAPRINT_API_KEY and PEAPRINT_API_BASE in .env.local and finish src/lib/pod/peaprint.ts."
      );
    }

    // Placeholder request shape -- update once real docs are available.
    const res = await fetch(`${process.env.PEAPRINT_API_BASE}/products`, {
      headers: {
        Authorization: `Bearer ${process.env.PEAPRINT_API_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Peaprint API error (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    const products = Array.isArray(data?.products) ? data.products : [];

    return products.map((p: any) => ({
      externalId: String(p.id ?? p.product_id),
      title: p.title ?? p.name ?? "Untitled product",
      description: stripHtml(p.description),
      imageUrl: p.image_url ?? p.thumbnail,
      priceCents: p.price_cents ?? Math.round((p.price ?? 0) * 100),
      currency: p.currency ?? "USD",
      variants: [],
      raw: p,
    }));
  },
};
