import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Admin moderation delete for a shop. Shop.products cascade, but OrderItem
// and Post still hold required/optional FKs onto Product with no onDelete,
// and Order.couponId can point at this shop's coupons -- clear those first
// or the shop delete fails the same way product Remove used to.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const shop = await db.shop.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  try {
    await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { shopId: shop.id }, select: { id: true } });
      const productIds = products.map((p) => p.id);

      if (productIds.length > 0) {
        await tx.post.updateMany({ where: { productId: { in: productIds } }, data: { productId: null } });
        await tx.orderItem.deleteMany({ where: { productId: { in: productIds } } });
      }

      await tx.order.updateMany({ where: { coupon: { shopId: shop.id } }, data: { couponId: null } });
      await tx.shop.delete({ where: { id: shop.id } });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete shop", params.id, err);
    return NextResponse.json({ error: "Could not delete this shop." }, { status: 500 });
  }
}
