import { ImportableProduct, PodAdapter, PodCredentials } from "./types";
import { stripHtml } from "./html";

function resolveCreds(creds: PodCredentials) {
  // No env var fallback: each shop must connect its own account.
  return { apiKey: creds.apiKey || "", apiBase: creds.apiBase || "" };
}

// Peaprint (peaprint.com) advertises an order-automation API on their site,
// but as of writing there is no public developer portal or published
// request/response schema to build against (unlike Printify and Printful).
//
// This adapter is a placeholder: it's wired into the same PodAdapter
// interface as the others so the UI and import flow "just work" once real
// docs/credentials are available. To finish it:
//   1. Get API docs/credentials from Peaprint support.
//   2. Connect them from the shop dashboard's Connections page.
//   3. Replace the fetch call below with their real catalog/products endpoint
//      and map the response fields into ImportableProduct.
export const peaprintAdapter: PodAdapter = {
  id: "PEAPRINT",
  label: "Peaprint",
  fields: [
    { key: "apiKey", label: "API Key" },
    { key: "apiBase", label: "API Base URL", placeholder: "https://api.peaprint.com" },
  ],

  isConfigured(creds: PodCredentials) {
    const { apiKey, apiBase } = resolveCreds(creds);
    return Boolean(apiKey && apiBase);
  },

  async listProducts(creds: PodCredentials): Promise<ImportableProduct[]> {
    const { apiKey, apiBase } = resolveCreds(creds);
    if (!apiKey || !apiBase) {
      throw new Error(
        "Peaprint isn't configured yet. Peaprint doesn't publish a public API reference " +
          "as of this build -- contact their support for API docs/credentials, then connect " +
          "them in Connections and finish src/lib/pod/peaprint.ts."
      );
    }

    // Placeholder request shape -- update once real docs are available.
    const res = await fetch(`${apiBase}/products`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
