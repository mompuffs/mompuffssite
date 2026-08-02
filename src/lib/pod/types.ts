export type ImportableVariant = {
  externalId: string;
  label: string;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
};

// Common shape every print-on-demand adapter normalizes its catalog into,
// so the UI and import route don't need to know provider-specific fields.
export type ImportableProduct = {
  externalId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  priceCents: number;
  currency: string;
  variants: ImportableVariant[];
  raw: unknown; // original provider payload, stored for debugging/reference
};

export interface PodAdapter {
  id: "PRINTIFY" | "PRINTFUL" | "PEAPRINT";
  label: string;
  /** True once the required env vars are present. */
  isConfigured(): boolean;
  /** Fetch a page of the seller's existing products from the provider. */
  listProducts(): Promise<ImportableProduct[]>;
}
