"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CartItem = {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  title: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
};

// Distinct variants of the same product are separate cart lines.
export function cartLineKey(item: { productId: string; variantId?: string }) {
  return item.variantId ?? item.productId;
}

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clear: () => void;
  totalCents: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "mompuffs.cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt cart data
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, "quantity">, quantity = 1) {
    setItems((prev) => {
      const key = cartLineKey(item);
      const existing = prev.find((i) => cartLineKey(i) === key);
      if (existing) {
        return prev.map((i) => (cartLineKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { ...item, quantity }];
    });
  }

  function removeItem(lineKey: string) {
    setItems((prev) => prev.filter((i) => cartLineKey(i) !== lineKey));
  }

  function updateQuantity(lineKey: string, quantity: number) {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => cartLineKey(i) !== lineKey)
        : prev.map((i) => (cartLineKey(i) === lineKey ? { ...i, quantity } : i))
    );
  }

  function clear() {
    setItems([]);
  }

  const totalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clear, totalCents }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
