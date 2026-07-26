"use client";

import { useEffect, useState } from "react";

/**
 * Compact next-session time for a workshop card, in the viewer's own timezone.
 * Shows "Live now" during a session, else "Next · 5 Aug, 18:30". Mount-guarded
 * to avoid a server/client hydration mismatch on the browser-local time.
 */
export function CardSessionTime({ iso, durationMin = 90 }: { iso: string; durationMin?: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(iso);
  if (now === null) {
    return <span suppressHydrationWarning className="text-muted">Upcoming session</span>;
  }
  const liveNow = start.getTime() <= now && now < start.getTime() + durationMin * 60_000;
  if (liveNow) {
    return <span className="font-semibold text-brick">● Live now</span>;
  }
  const date = start.toLocaleDateString([], { day: "numeric", month: "short" });
  const time = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <span suppressHydrationWarning>
      Next · {date}, {time}
    </span>
  );
}
