"use client";

/**
 * MANAGED — do not edit. Non-commerce conversion:
 *   saas     → startStep="signup", submitStep="subscription_checkout"
 *   lead_gen → startStep="form_start", submitStep="lead"
 *   service  → startStep="booking_start", submitStep="booking"
 * Fires the start step on first interaction (== storefront_walk required_steps).
 */
import { useRef, useState } from "react";
import { track } from "@/lib/funnel";
import { FUNNEL_COMPANY_ID, FUNNEL_API } from "@/funnel-config";

type Field = { name: string; label: string; type?: string; required?: boolean };
const DEFAULT_FIELDS: Field[] = [
  { name: "name", label: "Name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "message", label: "How can we help?", type: "textarea" },
];

export default function ConversionForm({
  startStep, submitStep, cta = "Send", fields = DEFAULT_FIELDS,
}: { startStep: string; submitStep: string; cta?: string; fields?: Field[] }) {
  const started = useRef(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const onStart = () => { if (started.current) return; started.current = true; track(startStep); };
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true);
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    track(submitStep, { kind: submitStep });
    try {
      if (FUNNEL_COMPANY_ID) {
        await fetch(`${FUNNEL_API}/api/companies/${FUNNEL_COMPANY_ID}/leads`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: submitStep, fields: payload }),
        }).catch(() => undefined);
      }
    } finally { setBusy(false); setSent(true); }
  };
  if (sent) return (
    <div className="rounded-lg border border-current/15 p-8 text-center">
      <p className="text-xl font-medium">Thank you.</p>
      <p className="mt-2 opacity-60">We&apos;ll be in touch shortly.</p>
    </div>
  );
  return (
    <form onSubmit={onSubmit} onFocusCapture={onStart} className="grid gap-5">
      {fields.map((f) => (
        <label key={f.name} className="grid gap-2 text-sm">
          <span className="uppercase tracking-wide opacity-60">{f.label}</span>
          {f.type === "textarea" ? (
            <textarea name={f.name} required={f.required} rows={4} className="border border-current/30 bg-transparent px-4 py-3 outline-none focus:border-current" />
          ) : (
            <input name={f.name} type={f.type || "text"} required={f.required} className="border border-current/30 bg-transparent px-4 py-3 outline-none focus:border-current" />
          )}
        </label>
      ))}
      <button type="submit" disabled={busy} className="justify-self-start bg-neutral-900 px-6 py-3 text-sm uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50">
        {busy ? "Sending…" : cta}
      </button>
    </form>
  );
}
