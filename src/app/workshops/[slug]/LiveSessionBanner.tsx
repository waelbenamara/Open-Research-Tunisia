"use client";

import { useEffect, useState } from "react";

/**
 * Prominent "next live session" / "live now" banner. Times are formatted in the
 * VIEWER'S OWN timezone by the browser (no IP guessing) and the zone is shown,
 * so nobody miscalculates when to show up. Re-checks every 30s so it flips to
 * "live now" while the page is open.
 */
export function LiveSessionBanner({
  session,
  online,
  location,
  canJoin,
  isEnrolled,
}: {
  session: { index: number; title: string; startISO: string; durationMin: number; meetingUrl: string | null };
  online: boolean;
  location: string | null;
  canJoin: boolean; // enrolled or facilitator/admin
  isEnrolled: boolean;
}) {
  // now stays null until mounted, so the server and the first client render
  // match (no hydration mismatch); the browser-local time appears right after.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(session.startISO);
  const end = new Date(start.getTime() + session.durationMin * 60_000);
  const liveNow = now !== null && start.getTime() <= now && now < end.getTime();

  const dateStr = start.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  const startStr = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const endStr = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

  const accent = liveNow ? "#8a3325" : "#4d6b3c";
  const tint = liveNow ? "rgba(138,51,37,0.06)" : "rgba(77,107,60,0.06)";

  return (
    <div
      className="mb-7 flex flex-wrap items-center gap-x-6 gap-y-3 border border-l-[3px] px-5 py-4"
      style={{ borderColor: "var(--color-line)", borderLeftColor: accent, background: tint }}
    >
      <div className="min-w-[220px] flex-1">
        <div className="flex items-center gap-2">
          {liveNow ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: accent }}>
              <span className="inline-block h-[8px] w-[8px] rounded-full" style={{ background: accent, boxShadow: `0 0 0 3px ${tint}` }} />
              Live now
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: accent }}>
              {online ? "Next live session" : "Next session"}
            </span>
          )}
        </div>
        <div className="mt-1 text-[15px] font-semibold text-ink">
          Session {session.index}: {session.title}
        </div>
        <div className="mt-0.5 text-[13.5px] text-ink-3" suppressHydrationWarning>
          {now === null ? (
            <span className="text-muted">Session time…</span>
          ) : liveNow ? (
            <>Happening now · ends {endStr}</>
          ) : (
            <>
              {dateStr} · {startStr}–{endStr} · {relative(start.getTime() - now)}
            </>
          )}
          {!online && location ? <> · {location}</> : null}
        </div>
      </div>

      <div className="shrink-0">
        {online && session.meetingUrl && canJoin ? (
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-5 py-2.5 text-[13.5px] font-semibold no-underline hover:no-underline"
            style={{ background: accent, color: "#faf8f3" }}
          >
            {liveNow ? "Join the live session →" : "Open the meeting link"}
          </a>
        ) : online && !session.meetingUrl && canJoin ? (
          <span className="text-[12.5px] text-muted">The join link will appear here before it starts.</span>
        ) : online && !isEnrolled ? (
          <span className="text-[12.5px] text-muted">Enrol to get the join link.</span>
        ) : null}
      </div>
    </div>
  );
}

/** "in 3 hours" / "in 2 days" / "in 15 min" for a positive ms delta. */
function relative(ms: number): string {
  if (ms <= 0) return "starting now";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `in ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `in ${hrs} hour${hrs === 1 ? "" : "s"}`;
  const days = Math.round(hrs / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
