"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A lightweight, dependency-free product tour.
 *
 * Steps target real chrome via `data-tour="<key>"` attributes; the engine dims
 * the page, cuts a spotlight "hole" over the target, and floats an on-brand
 * tooltip. Steps whose target is missing/hidden (e.g. admin-only, or nav hidden
 * on mobile) are skipped automatically. Centered steps (no selector) always show.
 *
 * Auto-starts once for a new visitor (localStorage-gated); the header's play
 * button dispatches `ort:start-tour` to replay it anytime.
 */

type Step = {
  key: string;
  selector?: string; // data-tour value; omit for a centered card
  title: string;
  body: string;
  emoji?: string;
};

const STEPS: Step[] = [
  {
    key: "welcome",
    title: "Welcome to Open Research Tunisia",
    body: "A place to join real research, learn the craft in workshops, and get credit for your contributions. Here's a 30-second tour — you can skip anytime.",
    emoji: "👋",
  },
  {
    key: "discover",
    selector: "discover",
    title: "Discover",
    body: "Browse open research projects and skill-building workshops. Every project lists the roles it needs — apply to any that fit.",
    emoji: "🧭",
  },
  {
    key: "mywork",
    selector: "mywork",
    title: "My work",
    body: "Your hub: the projects you've joined, tasks assigned to you, workshops you're enrolled in, and your contribution record.",
    emoji: "📌",
  },
  {
    key: "messages",
    selector: "messages",
    title: "Messages",
    body: "Private, one-to-one conversations with anyone on the platform — share files, and see when they're online.",
    emoji: "💬",
  },
  {
    key: "inbox",
    selector: "inbox",
    title: "Inbox",
    body: "Notifications land here: applications, task updates, workshop sessions, and new recordings. The badge shows what's unread.",
    emoji: "🔔",
  },
  {
    key: "account",
    selector: "account",
    title: "Your account",
    body: "Open this menu for your profile and settings — and, if you have posting rights, to publish a project or a workshop.",
    emoji: "👤",
  },
  {
    key: "replay",
    selector: "help",
    title: "Replay anytime",
    body: "That's it! Tap this play button whenever you'd like to take the tour again.",
    emoji: "🎬",
  },
];

const STORAGE_KEY = "ort_tour_v1";
const PAD = 8; // spotlight padding around the target
const CARD_W = 340;

export function Tour() {
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false); // target located & measured
  const cardRef = useRef<HTMLDivElement>(null);

  const locate = useCallback((step: Step): HTMLElement | null => {
    if (!step.selector) return null;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.selector}"]`);
    if (!el) return null;
    // Treat zero-size / display:none as absent (e.g. nav hidden on mobile).
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return el;
  }, []);

  // Resolve a step index in a direction, skipping targeted steps that aren't
  // present. Centered steps (no selector) always resolve.
  const resolve = useCallback(
    (from: number, dir: 1 | -1): number => {
      let idx = from;
      while (idx >= 0 && idx < STEPS.length) {
        const s = STEPS[idx];
        if (!s.selector || locate(s)) return idx;
        idx += dir;
      }
      return -1;
    },
    [locate],
  );

  const end = useCallback((markSeen = true) => {
    setActive(false);
    setRect(null);
    setReady(false);
    if (markSeen) {
      try {
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch {
        /* private mode — fine */
      }
    }
  }, []);

  const start = useCallback(() => {
    const first = STEPS[0].selector ? resolve(0, 1) : 0;
    setI(first < 0 ? 0 : first);
    setActive(true);
  }, [resolve]);

  // Measure the current target (after scrolling it into view).
  useEffect(() => {
    if (!active) return;
    const step = STEPS[i];
    const el = locate(step);
    setReady(false);

    if (!el) {
      setRect(null);
      setReady(true); // centered card
      return;
    }

    el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    const t = setTimeout(() => {
      setRect(el.getBoundingClientRect());
      setReady(true);
    }, 260);
    return () => clearTimeout(t);
  }, [active, i, locate]);

  // Keep the spotlight glued to the target on scroll/resize.
  useEffect(() => {
    if (!active) return;
    const update = () => {
      const el = locate(STEPS[i]);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, i, locate]);

  const next = useCallback(() => {
    const n = resolve(i + 1, 1);
    if (n < 0) end(true);
    else setI(n);
  }, [i, resolve, end]);

  const back = useCallback(() => {
    const p = resolve(i - 1, -1);
    if (p >= 0) setI(p);
  }, [i, resolve]);

  // Auto-start once for a new visitor.
  useEffect(() => {
    let seen = true;
    try {
      seen = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      seen = false;
    }
    if (seen) return;
    const t = setTimeout(() => start(), 900);
    return () => clearTimeout(t);
  }, [start]);

  // Replay trigger from the header play button.
  useEffect(() => {
    const onStart = () => start();
    window.addEventListener("ort:start-tour", onStart);
    return () => window.removeEventListener("ort:start-tour", onStart);
  }, [start]);

  // Keyboard controls.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end(true);
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, back, end]);

  if (!active || !ready) return null;

  const step = STEPS[i];
  const isFirst = resolve(i - 1, -1) < 0;
  const isLast = resolve(i + 1, 1) < 0;

  // Tooltip position.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let cardStyle: React.CSSProperties;
  if (rect) {
    const below = rect.bottom + 14;
    const placeBelow = below + 210 < vh;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - CARD_W / 2, 12), vw - CARD_W - 12);
    cardStyle = placeBelow
      ? { top: below, left }
      : { bottom: vh - rect.top + 14, left };
  } else {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  return (
    <div className="fixed inset-0 z-[9998]" aria-live="polite" role="dialog" aria-modal="true">
      {/* Click-catcher: blocks the page but not the tooltip. */}
      <div className="absolute inset-0" onClick={() => {}} />

      {/* Spotlight (or full dim for centered steps). */}
      {rect ? (
        <div
          className="pointer-events-none fixed transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(28,24,18,0.62)",
            outline: "2px solid var(--color-brick)",
            outlineOffset: 2,
          }}
        />
      ) : (
        <div className="fixed inset-0" style={{ background: "rgba(28,24,18,0.62)" }} />
      )}

      {/* Tooltip card. */}
      <div
        ref={cardRef}
        className="animate-popover fixed w-[340px] max-w-[calc(100vw-24px)] rounded-[16px] border border-line bg-card p-5 shadow-[0_20px_60px_rgba(28,24,18,0.35)]"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2.5">
          {step.emoji ? <span className="text-[22px] leading-none">{step.emoji}</span> : null}
          <h3 className="font-serif text-[19px] font-medium text-ink">{step.title}</h3>
        </div>
        <p className="text-[13.5px] leading-[1.55] text-ink-3">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          {/* Progress dots. */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, idx) => (
              <span
                key={s.key}
                className="h-[6px] rounded-full transition-all"
                style={{
                  width: idx === i ? 18 : 6,
                  background: idx === i ? "var(--color-brick)" : "var(--color-line-strong)",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst ? (
              <button
                type="button"
                onClick={back}
                className="cursor-pointer rounded-full border border-line bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-ink-4 hover:border-line-strong hover:text-ink"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="cursor-pointer rounded-full border-none px-4 py-1.5 text-[12.5px] font-semibold"
              style={{ background: "linear-gradient(135deg, #9a3b2b, #69241a)", color: "#faf8f3" }}
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>

        {!isLast ? (
          <button
            type="button"
            onClick={() => end(true)}
            className="absolute right-3 top-3 cursor-pointer border-none bg-transparent p-1 text-[12px] text-muted hover:text-brick"
            aria-label="Skip tour"
          >
            Skip
          </button>
        ) : null}
      </div>
    </div>
  );
}
