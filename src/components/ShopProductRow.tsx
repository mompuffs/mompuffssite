"use client";

import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/money";

export default function ShopProductRow({
  product,
}: {
  product: { id: string; title: string; priceCents: number; currency: string; source: string };
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Remove "${product.title}"?`)) return;
    await fetch(`/api/shop/products/${product.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between border-b py-2 text-sm">
      <div>
        <p className="font-medium">{product.title}</p>
        <p className="text-gray-500 text-xs">{product.source}</p>
      </div>
      <div className="flex items-center gap-3">
        <span>{formatCents(product.priceCents, product.currency)}</span>
        <button onClick={handleDelete} className="text-red-500 hover:underline">
          Remove
        </button>
      </div>
    </div>
  );
}
