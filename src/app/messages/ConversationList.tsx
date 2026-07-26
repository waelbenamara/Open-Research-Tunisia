"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { relativeTime } from "@/lib/format";
import type { ConversationRow } from "@/lib/conversations";
import { NewMessage } from "./NewMessage";

/**
 * The Messenger-style left rail: a live, self-updating list of conversations.
 * Polls the conversations endpoint so new messages, unread counts, ordering and
 * online dots stay fresh while a thread is open. Highlights the active thread
 * from the current path.
 */
export function ConversationList({ initial }: { initial: ConversationRow[] }) {
  const pathname = usePathname();
  const activeId = pathname.match(/^\/messages\/([^/]+)/)?.[1] ?? null;
  const [rows, setRows] = useState<ConversationRow[]>(initial);
  const [q, setQ] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    async function poll() {
      try {
        const res = await fetch("/api/messages/conversations");
        if (!res.ok) return;
        const data = await res.json();
        if (alive.current && Array.isArray(data.conversations)) setRows(data.conversations);
      } catch {
        /* transient */
      }
    }
    const id = setInterval(poll, 5000);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
  }, []);

  const term = q.trim().toLowerCase();
  const filtered = term ? rows.filter((r) => r.name.toLowerCase().includes(term)) : rows;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
        <h1 className="font-serif text-[22px] font-medium text-ink">Messages</h1>
        <NewMessage />
      </div>

      <div className="px-3 pb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search conversations…"
          aria-label="Search conversations"
          className="!py-2 !text-[13px]"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-muted">
            {rows.length === 0 ? "No conversations yet." : "No matches."}
          </p>
        ) : (
          filtered.map((c) => {
            const active = c.id === activeId;
            const unread = c.unread > 0;
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className={`group relative flex items-center gap-3 rounded-[12px] px-2.5 py-2.5 no-underline transition-colors hover:no-underline ${
                  active ? "bg-brick-tint" : unread ? "bg-brick-tint/40 hover:bg-brick-tint/70" : "hover:bg-tint"
                }`}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-brick" aria-hidden />
                ) : null}
                <div className="relative flex-none">
                  <Avatar name={c.name} color={c.avatarColor} src={c.avatarSrc} size={44} />
                  {c.online ? (
                    <span
                      className="pulse-online absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-paper bg-olive"
                      aria-label="Online"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-semibold text-ink">{c.name}</span>
                    <span className="shrink-0 text-[11px] text-muted">{relativeTime(c.at)}</span>
                  </div>
                  <div
                    className={`mt-0.5 truncate text-[12.5px] ${
                      unread ? "font-semibold text-ink-2" : "text-ink-4"
                    }`}
                  >
                    {c.fromMe ? <span className="text-muted">You: </span> : null}
                    {c.last || (c.hasAttachment ? "📎 Attachment" : "")}
                  </div>
                </div>
                {unread ? (
                  <span className="grid h-[20px] min-w-[20px] flex-none place-items-center rounded-full bg-brick px-1.5 text-[11px] font-bold text-paper">
                    {c.unread > 99 ? "99+" : c.unread}
                  </span>
                ) : null}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
