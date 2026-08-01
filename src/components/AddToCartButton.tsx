"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";

export default function AddToCartButton({
  product,
}: {
  product: { id: string; title: string; priceCents: number; imageUrl: string | null };
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({ productId: product.id, title: product.title, priceCents: product.priceCents, imageUrl: product.imageUrl });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleAdd}
      className="bg-brand-600 text-white px-5 py-2 rounded-full font-medium hover:bg-brand-700"
    >
      {added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
