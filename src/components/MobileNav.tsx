"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NavLink = { href: string; label: string; badge?: number };

/** The mobile navigation drawer — the main nav is desktop-only, so on phones
 *  this hamburger is the only way to reach Discover, Feed, People, etc. */
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const hasUnread = links.some((l) => (l.badge ?? 0) > 0);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : `Open menu${hasUnread ? " (unread items)" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-[8px] border-none bg-transparent text-ink-3 hover:bg-tint"
      >
        {!open && hasUnread ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brick" aria-hidden />
        ) : null}
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 top-[57px] z-40 bg-[rgba(28,24,18,0.35)]" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 max-h-[calc(100dvh-57px)] overflow-y-auto border-b border-line bg-paper shadow-[0_18px_40px_-20px_rgba(33,29,22,0.4)]">
            <nav className="flex flex-col px-4 py-1">
              {links.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-line-soft py-3.5 text-[15px] font-medium text-ink-2 no-underline last:border-b-0 hover:text-brick hover:no-underline"
                >
                  <span>{l.label}</span>
                  {l.badge ? (
                    <span className="grid h-[20px] min-w-[20px] place-items-center rounded-full bg-brick px-1.5 text-[11px] font-bold text-paper">
                      {l.badge > 99 ? "99+" : l.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
