export const PRODUCTS_PER_PAGE = 20;

export function parsePage(raw: string | undefined) {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function pageCount(total: number, perPage = PRODUCTS_PER_PAGE) {
  return Math.max(1, Math.ceil(Math.max(0, total) / perPage));
}
