"use client";

import { useEffect } from "react";

/** Heartbeat so the signed-in user shows as online. Mounted once in the layout.
 *  Pings on mount, on an interval, and when the tab regains focus. */
export function Presence() {
  useEffect(() => {
    let alive = true;
    const ping = () => {
      if (document.visibilityState === "visible") {
        fetch("/api/presence", { method: "POST" }).catch(() => {});
      }
    };
    ping();
    const id = setInterval(() => alive && ping(), 45_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return null;
}
