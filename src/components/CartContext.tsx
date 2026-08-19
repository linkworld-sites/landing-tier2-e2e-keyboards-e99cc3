"use client";

/**
 * MANAGED — do not edit. Cart state for the commerce conversion. `CartItem.
 * product_id` references `Product.id` (use `product.id` on the Product side).
 * Fires track('add_to_cart') on add (== storefront_walk commerce step).
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { Product, CartItem } from "@/lib/checkout";
import { track } from "@/lib/funnel";

type CartCtx = {
  items: CartItem[];
  count: number;
  add: (product: Product, quantity?: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "lw_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try { const r = localStorage.getItem(KEY); if (r) setItems(JSON.parse(r) as CartItem[]); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const add = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { product_id: product.id, quantity }];
    });
    track("add_to_cart", { product_id: product.id });
  }, []);
  const remove = useCallback((productId: string) =>
    setItems((prev) => prev.filter((i) => i.product_id !== productId)), []);
  const clear = useCallback(() => setItems([]), []);
  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const value = useMemo<CartCtx>(() => ({ items, count, add, remove, clear }),
    [items, count, add, remove, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
