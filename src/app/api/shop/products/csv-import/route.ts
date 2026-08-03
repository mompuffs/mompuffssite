import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { parseProductsCsv } from "@/lib/csvProducts";
import { resolveCategorySpec } from "@/lib/categories";
import { SHIPPING_MODES } from "@/lib/shipping";

const MAX_ROWS = 500;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const shop = await db.shop.findUnique({ where: { ownerId: user.id } });
  if (!shop) return NextResponse.json({ error: "You need a shop first." }, { status: 400 });

  const { csv } = await req.json();
  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "No CSV data received." }, { status: 400 });
  }

  const rows = parseProductsCsv(csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "That file has no data rows." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Please split into batches of ${MAX_ROWS} rows or fewer.` }, { status: 400 });
  }

  const categoryCache = new Map<string, string>();
  const errors: { row: number; reason: string }[] = [];
  let created = 0;

  // Sequential on purpose: category find-or-create needs to see categories
  // created by earlier rows in this same import (via categoryCache) rather
  // than racing duplicate creates for the same name.
  for (let i = 0; i < rows.length; i++) {
    const fileRow = i + 2; // +1 for header, +1 for 1-indexing
    const row = rows[i];

    const title = (row.title || "").trim();
    if (!title) {
      errors.push({ row: fileRow, reason: "Missing title." });
      continue;
    }

    const priceRaw = (row.price || "").replace(/[^0-9.]/g, "");
    const price = parseFloat(priceRaw);
    if (!priceRaw || !isFinite(price) || price <= 0) {
      errors.push({ row: fileRow, reason: "Missing or invalid price." });
      continue;
    }

    const shippingModeRaw = (row.shippingmode || "FLAT").toUpperCase();
    if (!SHIPPING_MODES.includes(shippingModeRaw as any)) {
      errors.push({ row: fileRow, reason: `shippingMode must be one of: ${SHIPPING_MODES.join(", ")}.` });
      continue;
    }

    let categoryIds: string[] = [];
    try {
      categoryIds = await resolveCategorySpec(shop.id, row.categories || "", categoryCache);
    } catch (e: any) {
      errors.push({ row: fileRow, reason: e?.message || "Couldn't resolve categories." });
      continue;
    }

    try {
      await db.product.create({
        data: {
          shopId: shop.id,
          title,
          description: row.description || undefined,
          priceCents: Math.round(price * 100),
          imageUrl: row.imageurl || undefined,
          source: "CSV",
          shippingMode: shippingModeRaw,
          shippingCents:
            shippingModeRaw === "PRODUCT" ? Math.round((parseFloat(row.shippingcost) || 0) * 100) : 0,
          categories: categoryIds.length > 0 ? { connect: categoryIds.map((id) => ({ id })) } : undefined,
        },
      });
      created++;
    } catch (e: any) {
      errors.push({ row: fileRow, reason: e?.message || "Couldn't create this product." });
    }
  }

  return NextResponse.json({ created, errors });
}
