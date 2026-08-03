export type ImportableVariant = {
  externalId: string;
  label: string;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  imageUrl?: string;
  // Option name -> value, e.g. { Colors: "Black", Sizes: "S" }, when the provider exposes it
  options?: Record<string, string>;
};

// Common shape every print-on-demand adapter normalizes its catalog into,
// so the UI and import route don't need to know provider-specific fields.
export type ImportableProduct = {
  externalId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  // Extra gallery photos (e.g. front/back/lifestyle angles), beyond imageUrl
  images?: string[];
  priceCents: number;
  currency: string;
  variants: ImportableVariant[];
  raw: unknown; // original provider payload, stored for debugging/reference
  // Category name(s) detected from the source (e.g. a scraped URL's JSON-LD
  // category field). Not auto-applied -- the UI uses it to pre-select a
  // matching existing category in the picker, nothing more.
  categoryHint?: string[];
};

// Credentials keyed by field name, e.g. { apiKey: "...", shopId: "..." }
export type PodCredentials = Record<string, string>;

export type PodFieldDef = {
  key: string;
  label: string;
  placeholder?: string;
};

export interface PodAdapter {
  id: "PRINTIFY" | "PRINTFUL" | "PEAPRINT";
  label: string;
  /** Describes the inputs a "connect" form needs to collect for this provider. */
  fields: PodFieldDef[];
  /** True once usable credentials are present (passed-in, or an env var fallback). */
  isConfigured(creds: PodCredentials): boolean;
  /** Fetch a page of the seller's existing products from the provider. */
  listProducts(creds: PodCredentials): Promise<ImportableProduct[]>;
}
