import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orders = await db.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
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
              <li key={item.id} className="flex justify-between">
                <span>{item.product.title} × {item.quantity}</span>
                <span>{formatCents(item.unitPriceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold border-t mt-2 pt-2">
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
