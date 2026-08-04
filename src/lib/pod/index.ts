import { PodAdapter } from "./types";
import { printifyAdapter } from "./printify";
import { printfulAdapter } from "./printful";

const adapters: Record<string, PodAdapter> = {
  printify: printifyAdapter,
  printful: printfulAdapter,
};

export function getPodAdapter(provider: string): PodAdapter | null {
  return adapters[provider.toLowerCase()] ?? null;
}

export function listPodAdapters(): PodAdapter[] {
  return Object.values(adapters);
}
