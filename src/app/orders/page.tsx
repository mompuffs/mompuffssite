import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { redirect } from "next/navigation";
import OrderItemRefund from "@/components/OrderItemRefund";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orders = await db.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: { include: { shop: { select: { name: true, slug: true } } } },
          refundRequests: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your orders</h1>
      {orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}
      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-xl shadow p-4 mb-3">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>{new Date(order.createdAt).toLocaleString()}</span>
            <span className="font-medium text-brand-600">{order.status}</span>
          </div>
          <ul className="text-sm space-y-1">
            {order.items.map((item) => (
              <li key={item.id}>
                <div className="flex justify-between">
                  <span>
                    {item.product.title}
                    {item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.quantity}{" "}
                    <a href={`/shop/${item.product.shop.slug}`} className="text-xs text-gray-400 hover:text-brand-600">
                      ({item.product.shop.name})
                    </a>
                  </span>
                  <span>{formatCents(item.unitPriceCents * item.quantity)}</span>
                </div>
                <OrderItemRefund orderItemId={item.id} latestRequest={item.refundRequests[0] ?? null} />
              </li>
            ))}
          </ul>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-sm text-green-700 mt-1">
              <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
              <span>-{formatCents(order.discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm mt-1">
            <span>Shipping</span>
            <span>{order.shippingCents > 0 ? formatCents(order.shippingCents) : "Free"}</span>
          </div>
          <div className="flex justify-between font-semibold border-t mt-2 pt-2">
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </div>
          {order.shippingName && (
            <div className="text-xs text-gray-500 mt-2 border-t pt-2">
              <p className="font-medium text-gray-600">Shipping to</p>
              <p>{order.shippingName}</p>
              <p>
                {order.shippingAddress1}
                {order.shippingAddress2 ? `, ${order.shippingAddress2}` : ""}
              </p>
              <p>
                {order.shippingCity}, {order.shippingState} {order.shippingZip}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
