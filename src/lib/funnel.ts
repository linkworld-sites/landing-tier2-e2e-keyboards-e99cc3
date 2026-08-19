import {
  FUNNEL_COMPANY_ID,
  FUNNEL_API,
  FUNNEL_META_PIXEL,
  FUNNEL_LINKEDIN_PIXEL,
  FUNNEL_JURISDICTION,
} from "@/funnel-config";

/**
 * Funnel tracking — logs the visitor journey to LinkWorld so the company
 * operator can see where visitors drop off and which source converts, and fires
 * the Meta / LinkedIn pixels for retargeting. Fire-and-forget via sendBeacon
 * (text/plain -> no CORS preflight). No-ops when not configured, so the site
 * never breaks. Managed file — do not edit; only call track("intent")/
 * track("convert") from components.
 */
const API = FUNNEL_API || "https://app.linkworld.ai";
const COMPANY_ID = FUNNEL_COMPANY_ID || "";

// Cookie consent gate. In the EU nothing non-essential fires until the visitor
// chooses (CookieConsent writes localStorage["lw_consent"]); outside the EU we
// assume no consent regime and allow tracking. "analytics" gates the LinkWorld
// funnel beacon, "marketing" gates the Meta/LinkedIn pixels.
function consentAllows(kind: "analytics" | "marketing"): boolean {
  if (FUNNEL_JURISDICTION !== "eu") return true;
  if (typeof window === "undefined") return false;
  try {
    const c = JSON.parse(localStorage.getItem("lw_consent") || "null");
    return !!(c && c[kind]);
  } catch {
    return false;
  }
}

let pixelsReady = false;

function ensurePixels(): void {
  if (pixelsReady || typeof window === "undefined") return;
  if (!consentAllows("marketing")) return; // wait for consent; retry on change
  pixelsReady = true;
  const w = window as any;
  if (FUNNEL_META_PIXEL && !w.fbq) {
    const fbq: any = function fbqFn(...args: any[]) {
      (fbqFn as any).callMethod
        ? (fbqFn as any).callMethod.apply(fbqFn, args)
        : (fbqFn as any).queue.push(args);
    };
    (fbq as any).queue = [];
    (fbq as any).loaded = true;
    (fbq as any).version = "2.0";
    (fbq as any).push = fbq;
    w.fbq = fbq;
    if (!w._fbq) w._fbq = fbq;
    const fbScript = document.createElement("script");
    fbScript.async = true;
    fbScript.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(fbScript, firstScript);
    }
    w.fbq("init", FUNNEL_META_PIXEL);
    w.fbq("track", "PageView");
  }
  if (FUNNEL_LINKEDIN_PIXEL && !w._linkedin_data_partner_ids) {
    w._linkedin_data_partner_ids = [FUNNEL_LINKEDIN_PIXEL];
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
    document.head.appendChild(s);
  }
}

function firePixel(step: string): void {
  const w = window as any;
  if (!w.fbq) return;
  // Standard events for the steps Meta optimizes toward; the rest are custom.
  if (step === "convert") w.fbq("track", "Lead");
  else if (step === "intent") w.fbq("track", "InitiateCheckout");
  else w.fbq("trackCustom", `funnel_${step}`);
}

function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let s = sessionStorage.getItem("lw_funnel_session");
    if (!s) {
      s = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("lw_funnel_session", s);
    }
    return s;
  } catch {
    return "anon";
  }
}

function utm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  // Persist first-seen UTM params for the whole session so attribution SURVIVES
  // in-site navigation — client/relative nav drops the ?utm_source query, which
  // otherwise leaves add_to_cart/checkout untagged (breaks real marketing
  // attribution AND made the storefront verify-walk false-negative: events fire
  // but the verify token isn't on them). On each call: capture from the URL if
  // present, else fall back to the stored value.
  for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
    let v = q.get(k);
    try {
      if (v) sessionStorage.setItem("lw_" + k, v);
      else v = sessionStorage.getItem("lw_" + k);
    } catch { /* sessionStorage unavailable — fall back to URL only */ }
    if (v) out[k] = v;
  }
  return out;
}

export function track(step: string, data: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || !step) return;
  ensurePixels();
  if (consentAllows("marketing")) firePixel(step);
  if (!COMPANY_ID) return; // the LinkWorld funnel beacon needs the company id
  if (!consentAllows("analytics")) return; // EU: no beacon without consent
  const u = utm();
  const body = JSON.stringify({
    step,
    session_id: sessionId(),
    utm_source: u.utm_source,
    event_data: { ...u, ...data, path: window.location.pathname },
  });
  const url = `${API}/api/public/funnel/${COMPANY_ID}/event`;
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
    } else {
      void fetch(url, { method: "POST", body, keepalive: true, mode: "no-cors" });
    }
  } catch {
    /* telemetry must never throw */
  }
}

// When consent is granted after first load, initialise the pixels (EU path).
if (typeof window !== "undefined") {
  window.addEventListener("lw-consent-changed", () => ensurePixels());
}
