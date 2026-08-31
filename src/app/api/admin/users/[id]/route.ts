import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Toggle another user's admin flag. The only mutation exposed here besides
// DELETE -- no generic PATCH-anything-about-a-user, keeps blast radius small.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { isAdmin } = await req.json();
  if (typeof isAdmin !== "boolean") {
    return NextResponse.json({ error: "isAdmin must be a boolean." }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: params.id }, select: { id: true, isAdmin: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Guard against locking everyone out of /admin: refuse to demote the last
  // remaining admin, whether that's someone demoting themselves or another
  // admin demoting them.
  if (target.isAdmin && !isAdmin) {
    const adminCount = await db.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Can't remove the last remaining admin." },
        { status: 400 }
      );
    }
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: { isAdmin },
    select: { id: true, isAdmin: true },
  });

  return NextResponse.json(updated);
}

async function deleteShopContents(tx: typeof db, shopId: string) {
  const products = await tx.product.findMany({ where: { shopId }, select: { id: true } });
  const productIds = products.map((p) => p.id);
  if (productIds.length > 0) {
    await tx.post.updateMany({ where: { productId: { in: productIds } }, data: { productId: null } });
    await tx.orderItem.deleteMany({ where: { productId: { in: productIds } } });
  }
  await tx.order.updateMany({ where: { coupon: { shopId } }, data: { couponId: null } });
  await tx.shop.delete({ where: { id: shopId } });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  if (admin.id === params.id) {
    return NextResponse.json({ error: "You can't delete your own account from here." }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, isAdmin: true, shop: { select: { id: true } } },
  });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (target.isAdmin) {
    const adminCount = await db.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Can't delete the last remaining admin." }, { status: 400 });
    }
  }

  try {
    await db.$transaction(async (tx) => {
      if (target.shop) {
        await deleteShopContents(tx as unknown as typeof db, target.shop.id);
      }
      await tx.user.delete({ where: { id: target.id } });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete user", params.id, err);
    return NextResponse.json({ error: "Could not delete this user." }, { status: 500 });
  }
}
