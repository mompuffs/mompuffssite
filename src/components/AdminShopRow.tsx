"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/money";

type AdminShop = {
  id: string;
  name: string;
  slug: string;
  visitCount: number;
  flatShippingCents: number;
  owner: { username: string; displayName: string };
  _count: { products: number };
};

export default function AdminShopRow({ shop }: { shop: AdminShop }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete "${shop.name}"? This removes the shop, its products, and this shop's items from existing orders.`
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/shops/${shop.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(typeof data.error === "string" ? data.error : "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 pr-4">
        <Link href={`/shop/${shop.slug}`} className="font-medium hover:underline">
          {shop.name}
        </Link>
      </td>
      <td className="py-2.5 pr-4 text-gray-500">
        <Link href={`/profile/${shop.owner.username}`} className="hover:underline">
          {shop.owner.displayName}
        </Link>
      </td>
      <td className="py-2.5 pr-4 text-gray-500">{shop._count.products}</td>
      <td className="py-2.5 pr-4 text-gray-500">{formatCents(shop.flatShippingCents)}</td>
      <td className="py-2.5 pr-4 text-gray-500">{shop.visitCount}</td>
      <td className="py-2.5 text-right">
        <button
          onClick={handleDelete}
          disabled={busy}
          className="text-xs text-red-600 hover:underline disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </td>
    </tr>
  );
}
