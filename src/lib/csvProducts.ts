// Minimal RFC4180-ish CSV parser: handles quoted fields, embedded commas,
// embedded newlines, and "" as an escaped quote inside a quoted field.
// Good enough for the product bulk-upload format without pulling in a
// dependency for it.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let i = 0;
  while (i < s.length) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export type ProductCsvRow = Record<string, string>;

// Parses a header-row CSV into objects keyed by lowercased header name.
export function parseProductsCsv(text: string): ProductCsvRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj: ProductCsvRow = {};
    header.forEach((key, idx) => {
      obj[key] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

export const PRODUCT_CSV_COLUMNS = [
  "title",
  "description",
  "price",
  "categories",
  "imageurl",
  "shippingmode",
  "shippingcost",
] as const;

export function buildProductCsvTemplate(): string {
  const header = "title,description,price,categories,imageUrl,shippingMode,shippingCost";
  const example =
    '"Mom Puffs Coffee Mug","11oz ceramic mug with the Mom Puffs logo.",19.99,"Household > Cups and Mugs; Collections > Mom Puffs",https://example.com/mug.jpg,FLAT,';
  return `${header}\n${example}\n`;
}
