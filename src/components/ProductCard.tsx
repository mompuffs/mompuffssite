import Link from "next/link";
import { formatCents } from "@/lib/money";

type Product = {
  id: string;
  title: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  shop: { name: string; slug: string };
};

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} className="bg-white rounded-xl shadow overflow-hidden hover:shadow-md transition block">
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-sm">No image</span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm truncate">{product.title}</p>
        <p className="text-brand-600 font-semibold">{formatCents(product.priceCents, product.currency)}</p>
        <p className="text-xs text-gray-500 truncate">by {product.shop.name}</p>
      </div>
    </Link>
  );
}
