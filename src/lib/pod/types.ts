export type ImportableVariant = {
  externalId: string;
  label: string;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  imageUrl?: string;
  options?: Record<string, string>;
};

export type ImportableProduct = {
  externalId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  priceCents: number;
  currency: string;
  variants: ImportableVariant[];
  raw: unknown;
  categoryHint?: string[];
};

export type PodCredentials = Record<string, string>;

export type PodFieldDef = {
  key: string;
  label: string;
  placeholder?: string;
};

export interface PodAdapter {
  id: "PRINTIFY" | "PRINTFUL" | "SHOPIFY" | "BIGCOMMERCE" | "WIX" | "SQUARE" | "STRIPE";
  label: string;
  fields: PodFieldDef[];
  isConfigured(creds: PodCredentials): boolean;
  listProducts(creds: PodCredentials): Promise<ImportableProduct[]>;
}
