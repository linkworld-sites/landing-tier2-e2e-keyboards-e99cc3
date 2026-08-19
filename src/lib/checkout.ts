import { FUNNEL_COMPANY_ID, FUNNEL_API } from "@/funnel-config";
import { track } from "@/lib/funnel";

/**
 * Storefront checkout — talks to LinkWorld so the company collects payments
 * into its own connected account. fetchProducts() lists the live catalog;
 * checkout() creates a hosted payment session and redirects to it. Managed
 * file — do not edit; build the cart/catalog UI on top of these helpers.
 */
const API = FUNNEL_API || "https://app.linkworld.ai";
const COMPANY_ID = FUNNEL_COMPANY_ID || "";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  stock: number | null;
};

export type CartItem = { product_id: string; quantity: number };

/** Live product catalog for this company (empty when not configured). */
export async function fetchProducts(): Promise<Product[]> {
  if (!COMPANY_ID) return [];
  try {
    // no-store: the catalog is LIVE data (name/price/image editable in the
    // cockpit any time). Next.js App Router caches plain fetch() in server
    // components AT BUILD TIME, so an agent-written server page (e.g.
    // `const products = await fetchProducts()` in app/shop/page.tsx) baked a
    // stale catalog into the prerender — catalog edits (surf shop product
    // images, 2026-07-01) never appeared without a full rebuild. no-store
    // opts that route into dynamic rendering; in client components it is a
    // regular uncached fetch (harmless).
    const r = await fetch(`${API}/api/companies/${COMPANY_ID}/products/public`, { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.products || []) as Product[];
  } catch {
    return [];
  }
}

/** Format integer cents as a localized price string. */
export function formatPrice(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "EUR",
  }).format((cents || 0) / 100);
}

/**
 * Start checkout for a basket: creates a hosted payment session and redirects
 * the browser to it. Fires the 'intent' funnel step. Returns false if checkout
 * could not be started (the caller can show an error).
 */
export async function checkout(
  items: CartItem[],
  opts: { customerEmail?: string; successUrl?: string } = {},
): Promise<boolean> {
  if (!COMPANY_ID || !items.length) return false;
  try {
    track("intent");
    let session: string | undefined;
    if (typeof window !== "undefined") {
      session = sessionStorage.getItem("lw_funnel_session") || undefined;
    }
    const r = await fetch(`${API}/api/companies/${COMPANY_ID}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        customer_email: opts.customerEmail,
        session_id: session,
        success_url: opts.successUrl,
      }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    if (data.checkout_url) {
      window.location.href = data.checkout_url as string;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
