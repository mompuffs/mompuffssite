import { PodAdapter } from "./types";
import { printifyAdapter } from "./printify";
import { printfulAdapter } from "./printful";
import { shopifyAdapter } from "./shopify";
import { bigcommerceAdapter } from "./bigcommerce";
import { wixAdapter } from "./wix";
import { squareAdapter } from "./square";
import { stripeAdapter } from "./stripe";

const adapters: Record<string, PodAdapter> = {
  printify: printifyAdapter,
  printful: printfulAdapter,
  shopify: shopifyAdapter,
  bigcommerce: bigcommerceAdapter,
  wix: wixAdapter,
  square: squareAdapter,
  stripe: stripeAdapter,
};

export function getPodAdapter(provider: string): PodAdapter | null {
  return adapters[provider.toLowerCase()] ?? null;
}

export function listPodAdapters(): PodAdapter[] {
  return Object.values(adapters);
}
