"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/money";

type ShopOrder = {
  id: string;
  createdAt: string;
  buyer: { username: string; displayName: string; email: string };
  totalCents: number;
  shippingCents: number;
  discountCents: number;
  subtotalCents: number;
  isOpen: boolean;
  contactPhone: string | null;
  shippingName: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  items: {
    id: string;
    title: string;
    variantLabel: string | null;
    quantity: number;
    unitPriceCents: number;
    fulfilledAt: string | null;
  }[];
};

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<ShopOrder[] | null>(null);
  const [filter, setFilter] = useState<"open" | "completed" | "all">("open");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function load() {
    fetch("/api/shop/orders")
      .then((r) => r.json())
      .then(setOrders);
  }

  useEffect(load, []);

  async function toggleComplete(order: ShopOrder) {
    setUpdatingId(order.id);
    await fetch(`/api/shop/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: order.isOpen }),
    });
    setUpdatingId(null);
    load();
  }

  const visible = (orders ?? []).filter((o) => {
    if (filter === "open") return o.isOpen;
    if (filter === "completed") return !o.isOpen;
    return true;
  });

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link href="/dashboard/shop" className="text-sm text-brand-600 hover:underline">
          ← Back to shop
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Only your own items in each order are shown -- a buyer's cart can include other shops' products too.
      </p>

      <div className="flex gap-1 mb-4 text-sm">
        {(["open", "completed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full border ${
              filter === f ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f === "open" ? "Open" : f === "completed" ? "Completed" : "All"}
          </button>
        ))}
      </div>

      {!orders ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500">No {filter === "all" ? "" : filter} orders.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>{new Date(order.createdAt).toLocaleString()}</span>
                <span
                  className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                    order.isOpen ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                  }`}
                >
                  {order.isOpen ? "Open" : "Completed"}
                </span>
              </div>

              <p className="text-sm mb-2">
                <span className="font-medium">{order.buyer.displayName}</span>{" "}
                <span className="text-gray-500">
                  (@{order.buyer.username} · {order.buyer.email})
                </span>
              </p>

              <ul className="text-sm space-y-1 mb-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.title}
                      {item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.quantity}
                    </span>
                    <span>{formatCents(item.unitPriceCents * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="flex justify-between text-sm font-medium border-t pt-2 mb-2">
                <span>Your items subtotal</span>
                <span>{formatCents(order.subtotalCents)}</span>
              </div>

              {order.shippingName && (
                <div className="text-xs text-gray-500 border rounded p-2 mb-2">
                  <p className="font-medium text-gray-700">Ship to</p>
                  <p>{order.shippingName}</p>
                  <p>
                    {order.shippingAddress1}
                    {order.shippingAddress2 ? `, ${order.shippingAddress2}` : ""}
                  </p>
                  <p>
                    {order.shippingCity}, {order.shippingState} {order.shippingZip}
                  </p>
                  <p>{order.shippingCountry}</p>
                  {order.contactPhone && <p>Phone: {order.contactPhone}</p>}
                </div>
              )}

              <button
                onClick={() => toggleComplete(order)}
                disabled={updatingId === order.id}
                className={`text-xs font-medium px-3 py-1.5 rounded ${
                  order.isOpen
                    ? "bg-brand-600 text-white hover:bg-brand-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-60`}
              >
                {updatingId === order.id ? "Saving…" : order.isOpen ? "Mark complete" : "Reopen"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
