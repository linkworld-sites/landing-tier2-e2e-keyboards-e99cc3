"use client";

import { useEffect } from "react";
import { track } from "@/lib/funnel";

/**
 * Site-wide funnel instrumentation. Wrapped once in layout.tsx (next to
 * SmoothScroll). Auto-fires "landing" on first load and "engage" on the first
 * real interaction (a meaningful scroll or any click). Wire "intent" (primary
 * CTA) and "convert" (form submit / purchase) yourself — see the coding rules.
 */
export function FunnelTracker() {
  useEffect(() => {
    track("landing");
    let engaged = false;
    const fire = () => {
      if (engaged) return;
      engaged = true;
      track("engage");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("click", onClick);
    };
    const onScroll = () => {
      if (window.scrollY > 300) fire();
    };
    const onClick = () => fire();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
