"use client";

/**
 * MANAGED — do not edit. Commerce shop UI. Uses `product.id` (NOT product_id);
 * fires track('checkout') here + track('add_to_cart') in CartContext (==
 * storefront_walk). The managed `checkout()` handles hosted payment + redirect.
 * Neutral styling — inherits the site's fonts/colors.
 */
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/checkout";
import { checkout, formatPrice, fetchProducts } from "@/lib/checkout";
import { track } from "@/lib/funnel";
import { useCart } from "@/components/CartContext";

export default function ShopClient({ products }: { products: Product[] }) {
  const { items, count, add, remove, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The catalog is data, not markup: always reflect the LIVE backend (the
  // single source checkout prices from). Start with the server-passed list (so
  // SSR / a static prerender still shows products), then refetch on mount so
  // real backend ids — the only ones checkout can sell — replace any stale
  // build-time/demo entries. This makes display id == checkout id without
  // needing a rebuild when the catalog changes.
  const [catalog, setCatalog] = useState<Product[]>(products);
  useEffect(() => {
    let alive = true;
    fetchProducts().then((live) => {
      if (alive && live.length) setCatalog(live);
    });
    return () => { alive = false; };
  }, []);
  const byId = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of catalog) m.set(p.id, p);
    return m;
  }, [catalog]);
  const total = useMemo(() => items.reduce((s, i) => {
    const p = byId.get(i.product_id); return s + (p ? p.price_cents * i.quantity : 0);
  }, 0), [items, byId]);

  // Only real backend products (UUID id) are sellable. The static prerender may
  // briefly show the products.ts demo (slug ids) before the live refetch swaps
  // in the backend catalog — guard add-to-cart so a stale demo item can never
  // enter the cart and 404 at checkout (display id == checkout id).
  const sellable = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const onCheckout = async () => {
    if (!items.length) return;
    // Self-heal a stale cart: localStorage may hold items whose ids are no
    // longer in the live catalog (e.g. old demo-slug ids added before the
    // backend catalog loaded). Drop those, check out only what the backend can
    // actually price — otherwise checkout 404s on a phantom id.
    const valid = items.filter((i) => byId.has(i.product_id));
    items.filter((i) => !byId.has(i.product_id)).forEach((i) => remove(i.product_id));
    if (!valid.length) {
      setError("Your cart was out of date and has been cleared — please add items again.");
      return;
    }
    setError(null); setBusy(true);
    track("checkout");
    const ok = await checkout(valid);
    setBusy(false);
    if (!ok) setError("Checkout couldn't be started right now. Please try again in a moment.");
  };

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_320px]">
      <ul className="grid gap-8 sm:grid-cols-2">
        {catalog.map((p) => (
          <li key={p.id} className="group flex flex-col">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-neutral-100">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-300">
                  <span className="text-2xl">{p.name}</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-4">
              <h3 className="text-lg font-medium">{p.name}</h3>
              <span className="tabular-nums opacity-70">{formatPrice(p.price_cents, p.currency)}</span>
            </div>
            {p.description ? <p className="mt-1 text-sm opacity-60">{p.description}</p> : null}
            <button type="button" onClick={() => add(p)} disabled={!sellable(p.id)} className="mt-4 self-start border border-current px-5 py-2 text-sm uppercase tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed">
              {sellable(p.id) ? "Add to cart" : "Loading…"}
            </button>
          </li>
        ))}
      </ul>
      <aside className="h-fit border border-current/15 p-6 md:sticky md:top-24">
        <h2 className="text-xl font-medium">Cart ({count})</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm opacity-60">Your cart is empty.</p>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {items.map((i) => {
                const p = byId.get(i.product_id);
                if (!p) return null;
                return (
                  <li key={i.product_id} className="flex justify-between gap-3 text-sm">
                    <span>{p.name} × {i.quantity}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{formatPrice(p.price_cents * i.quantity, p.currency)}</span>
                      <button type="button" aria-label={`Remove ${p.name}`} onClick={() => remove(i.product_id)} className="opacity-40 hover:opacity-100">×</button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-between border-t border-current/15 pt-4 font-medium">
              <span>Total</span><span className="tabular-nums">{formatPrice(total)}</span>
            </div>
            <button type="button" onClick={onCheckout} disabled={busy} className="mt-4 w-full bg-neutral-900 px-5 py-3 text-sm uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50">
              {busy ? "Starting checkout…" : "Checkout"}
            </button>
            <button type="button" onClick={clear} className="mt-2 w-full text-xs uppercase tracking-wide opacity-40 hover:opacity-100">Clear cart</button>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </>
        )}
      </aside>
    </div>
  );
}
