"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ConversationList } from "./ConversationList";
import type { ConversationRow } from "@/lib/conversations";

/**
 * Messenger-style split view: a persistent conversation rail beside the active
 * thread. On mobile it's a master/detail — the list when no thread is open, the
 * thread (full width) when one is. The rail persists across thread navigations
 * because it lives in the messages layout.
 */
export function MessagesShell({
  conversations,
  children,
}: {
  conversations: ConversationRow[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const onThread = /^\/messages\/[^/]+/.test(pathname);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 sm:px-5">
      {/* Shorter on phones to clear the fixed bottom tab bar; full height on md+. */}
      <div className="flex h-[calc(100dvh-172px)] min-h-[420px] overflow-hidden rounded-[18px] border border-line bg-card shadow-[0_10px_40px_-24px_rgba(33,29,22,0.5)] md:h-[calc(100dvh-118px)]">
        {/* Left rail */}
        <aside
          className={`${
            onThread ? "hidden md:flex" : "flex"
          } w-full flex-col border-line bg-sand/40 py-3 md:w-[326px] md:border-r`}
        >
          <ConversationList initial={conversations} />
        </aside>

        {/* Active thread / empty state */}
        <section className={`${onThread ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
          {children}
        </section>
      </div>
    </div>
  );
}
