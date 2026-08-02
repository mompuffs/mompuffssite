"use client";

import Link from "next/link";
import { useCart, cartLineKey } from "@/components/CartContext";
import { formatCents } from "@/lib/money";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalCents } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center mt-12">
        <p className="text-gray-500">Your cart is empty.</p>
        <Link href="/marketplace" className="text-brand-600 hover:underline">
          Browse the marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your cart</h1>
      <div className="bg-white rounded-xl shadow divide-y">
        {items.map((item) => {
          const key = cartLineKey(item);
          return (
            <div key={key} className="flex items-center gap-3 p-4">
              <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.title}</p>
                {item.variantLabel && <p className="text-xs text-gray-500">{item.variantLabel}</p>}
                <p className="text-sm text-brand-600">{formatCents(item.priceCents)}</p>
              </div>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateQuantity(key, Number(e.target.value))}
                className="w-14 border rounded px-2 py-1 text-sm"
              />
              <button onClick={() => removeItem(key)} className="text-red-500 text-sm hover:underline">
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-4 bg-white rounded-xl shadow p-4">
        <span className="font-semibold">Total: {formatCents(totalCents)}</span>
        <Link href="/checkout" className="bg-brand-600 text-white px-5 py-2 rounded-full font-medium hover:bg-brand-700">
          Checkout
        </Link>
      </div>
    </div>
  );
}
