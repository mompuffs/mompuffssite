import { ImportableProduct, PodAdapter, PodCredentials } from "./types";
import { stripHtml } from "./html";

export const squareAdapter: PodAdapter = {
  id: "SQUARE",
  label: "Square",
  fields: [
    { key: "apiKey", label: "Access token", placeholder: "Square application access token" },
    { key: "environment", label: "Environment: production or sandbox", placeholder: "production" },
  ],

  isConfigured(creds) {
    return Boolean(creds.apiKey);
  },

  async listProducts(creds: PodCredentials): Promise<ImportableProduct[]> {
    const token = creds.apiKey || "";
    if (!token) throw new Error("Square isn't connected. Add your access token in Connections.");
    const sandbox = (creds.environment || "production").toLowerCase() === "sandbox";
    const host = sandbox ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";

    const res = await fetch(`${host}/v2/catalog/list?types=ITEM,IMAGE`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Square API error (${res.status}): ${text || res.statusText}`);
    }
    const data = await res.json();
    const objects = Array.isArray(data?.objects) ? data.objects : [];
    const images = new Map<string, string>();
    for (const obj of objects) {
      if (obj.type === "IMAGE" && obj.image_data?.url) images.set(obj.id, obj.image_data.url);
    }

    return objects
      .filter((obj: any) => obj.type === "ITEM")
      .slice(0, 50)
      .map((obj: any) => {
        const item = obj.item_data || {};
        const imageUrl = (item.image_ids || []).map((id: string) => images.get(id)).find(Boolean);
        const variations = item.variations || [];
        const variants = variations.map((v: any) => {
          const money = v.item_variation_data?.price_money;
          return {
            externalId: String(v.id),
            label: v.item_variation_data?.name || item.name,
            priceCents: money?.amount != null ? Number(money.amount) : 0,
            currency: money?.currency || "USD",
            isAvailable: true,
            imageUrl,
          };
        });
        return {
          externalId: String(obj.id),
          title: item.name,
          description: stripHtml(item.description),
          imageUrl,
          images: imageUrl ? [imageUrl] : [],
          priceCents: variants[0]?.priceCents ?? 0,
          currency: variants[0]?.currency ?? "USD",
          variants,
          raw: obj,
        };
      });
  },
};
