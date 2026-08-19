"use client";

import { useEffect } from "react";

/**
 * Grow cockpit edit bridge. When this site is shown inside the cockpit's
 * Website tab (iframe + ?lw_edit=1), load LinkWorld's section-select bridge
 * so the founder can click a section and hand the edit to the operator chat.
 * For normal visitors this is a no-op: no request, no bridge code.
 * Mounted once in layout.tsx next to <FunnelTracker/> — keep it there.
 */
export function EditBridge() {
  useEffect(() => {
    try {
      if (window.self === window.top) return;
      if (new URLSearchParams(window.location.search).get("lw_edit") !== "1") return;
      document.documentElement.setAttribute("data-bridge-mode", "runner");
      const s = document.createElement("script");
      s.src = "https://app.linkworld.ai/api/public/bridge/interactive.js";
      document.head.appendChild(s);
    } catch {
      /* never break the site over the edit preview */
    }
  }, []);
  return null;
}
