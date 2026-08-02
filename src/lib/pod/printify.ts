import { ImportableProduct, PodAdapter, PodCredentials } from "./types";
import { stripHtml } from "./html";

// Printify REST API v1. Docs: https://developers.printify.com/docs/
// Auth: Bearer token (Personal Access Token from My Profile > Connections),
// plus a required User-Agent header on every request.
const BASE_URL = "https://api.printify.com/v1";

function resolveCreds(creds: PodCredentials) {
  // No env var fallback: each shop must connect its own account, so one
  // seller's catalog is never used to serve another seller's imports.
  return { apiKey: creds.apiKey || "", shopId: creds.shopId || "" };
}

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "User-Agent": "mompuffs-app",
    "Content-Type": "application/json",
  };
}

export const printifyAdapter: PodAdapter = {
  id: "PRINTIFY",
  label: "Printify",
  fields: [
    { key: "apiKey", label: "Personal Access Token", placeholder: "My Profile → Connections" },
    { key: "shopId", label: "Shop ID" },
  ],

  isConfigured(creds: PodCredentials) {
    const { apiKey, shopId } = resolveCreds(creds);
    return Boolean(apiKey && shopId);
  },

  async listProducts(creds: PodCredentials): Promise<ImportableProduct[]> {
    const { apiKey, shopId } = resolveCreds(creds);
    if (!apiKey || !shopId) {
      throw new Error("Printify isn't connected. Add your Personal Access Token and Shop ID in Connections.");
    }


    const res = await fetch(`${BASE_URL}/shops/${shopId}/products.json?limit=25`, {
      headers: headers(apiKey),
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
      // color). Printify's own `is_default` pick is unreliable here: for some
      // colors the flat "back"/"front" mockup it flags as default is a stale
      // template that doesn't show the print at all, while the "person"
      // lifestyle photo (not flagged default) does. Prefer a person photo
      // when one exists, then is_default, then whatever matched first.
      function resolveImage(variant: any): string | undefined {
        const matches = images.filter(
          (img: any) => Array.isArray(img.variant_ids) && img.variant_ids.includes(variant.id)
        );
        if (matches.length === 0) return undefined;
        const personShot = matches.find((img: any) => /camera_label=person/i.test(img.src));
        const defaultShot = matches.find((img: any) => img.is_default);
        return (personShot ?? defaultShot ?? matches[0]).src;
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

      const defaultImageObj =
        images.find((img: any) => /camera_label=person/i.test(img.src)) ??
        images.find((img: any) => img.is_default) ??
        images[0];

      // Images sharing the exact same variant_ids array come from the same
      // photoshoot (front/back/closeup/lifestyle angles of the same color),
      // unlike is_default which only ever points at one shot. Use that group
      // as the gallery so the product page shows all the angles Printify has
      // for the default color, without pulling in every other color's shots.
      const galleryGroupKey = defaultImageObj?.variant_ids ? JSON.stringify(defaultImageObj.variant_ids) : undefined;
      const gallery = galleryGroupKey
        ? Array.from(
            new Set(
              images
                .filter((img: any) => JSON.stringify(img.variant_ids) === galleryGroupKey)
                .map((img: any) => img.src)
            )
          )
        : [];

      return {
        externalId: String(p.id),
        title: p.title,
        description: stripHtml(p.description),
        imageUrl: defaultImageObj?.src,
        images: gallery,
        priceCents: variants[0]?.priceCents ?? 0,
        currency: "USD",
        variants,
        raw: p,
      };
    });
  },
};
