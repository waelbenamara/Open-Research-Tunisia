"use client";

import { useEffect, useState } from "react";

/**
 * Renders a stored UTC instant in the VIEWER'S local timezone, so it matches
 * both the time the facilitator picked (see LocalDateTimeInput) and the live
 * banner. Mount-guarded: SSR and the first client render both show a
 * deterministic UTC string, then the effect swaps in local time — this avoids
 * a hydration mismatch while still landing on the viewer's own clock.
 */
export function LocalDateTime({
  iso,
  withTz = false,
  className,
}: {
  iso: string;
  withTz?: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;

  let text: string;
  if (mounted) {
    // Viewer-local.
    const date = d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...(withTz ? { timeZoneName: "short" } : {}),
    });
    text = `${date} · ${time}`;
  } else {
    // Deterministic UTC placeholder (fixed timeZone → same on server & client).
    const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
    text = `${date} · ${time}`;
  }

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
