"use client";

import { useEffect, useRef, useState } from "react";
import { sendDirectMessageAction } from "@/actions/messages";
import { dateTime, lastSeen as fmtLastSeen } from "@/lib/format";

type Msg = { id: string; body: string; senderId: string; createdAt: string };

export function LiveThread({
  meId,
  other,
  initialMessages,
  initialSeenUpToAt,
}: {
  meId: string;
  other: { id: string; online: boolean; lastSeenAt: string | null; suspended: boolean };
  initialMessages: Msg[];
  initialSeenUpToAt: string | null;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [online, setOnline] = useState(other.online);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(other.lastSeenAt);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [seenUpToAt, setSeenUpToAt] = useState<string | null>(initialSeenUpToAt);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSent = useRef(0);
  // Cursor = id of the newest message we know about.
  const cursor = useRef<string>(initialMessages[initialMessages.length - 1]?.id ?? "");

  function scrollToBottom(smooth = true) {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }
  useEffect(() => scrollToBottom(false), []);

  // Poll loop — new messages, partner presence + typing, and read receipts.
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch(`/api/messages/${other.id}/poll?after=${cursor.current}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        if (Array.isArray(data.messages) && data.messages.length) {
          setMessages((prev) => {
            const merged = mergeIncoming(prev, data.messages as Msg[]);
            if (merged === prev) return prev;
            cursor.current = (data.messages as Msg[])[data.messages.length - 1].id;
            return merged;
          });
          setTimeout(() => scrollToBottom(), 30);
        }
        setOnline(!!data.partner?.online);
        setLastSeenAt(data.partner?.lastSeenAt ?? null);
        setPartnerTyping(!!data.partner?.typing);
        setSeenUpToAt(data.seenUpToAt ?? null);
      } catch {
        /* transient — try again next tick */
      }
    }
    poll();
    const id = setInterval(poll, 3500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [other.id]);

  function onType(next: string) {
    setValue(next);
    const now = Date.now();
    if (next && now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      fetch(`/api/messages/${other.id}/typing`, { method: "POST" }).catch(() => {});
    }
  }

  async function send() {
    const body = value.trim();
    if (!body || sending) return;
    setSending(true);
    // Optimistic bubble so it appears instantly.
    const tempId = `temp-${now()}`;
    const optimistic: Msg = { id: tempId, body, senderId: meId, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setValue("");
    setTimeout(() => scrollToBottom(), 20);
    const fd = new FormData();
    fd.set("recipientId", other.id);
    fd.set("body", body);
    try {
      const res = await sendDirectMessageAction(fd);
      // Replace the optimistic bubble with the real row (or drop it if the poll
      // already brought the real one in), so it never shows twice.
      if (res?.id) {
        const real: Msg = { id: res.id, body, senderId: meId, createdAt: res.createdAt };
        setMessages((prev) => {
          if (prev.some((m) => m.id === real.id)) return prev.filter((m) => m.id !== tempId);
          return prev.map((m) => (m.id === tempId ? real : m));
        });
        cursor.current = res.id;
      }
    } finally {
      setSending(false);
    }
  }

  const seenTime = seenUpToAt ? new Date(seenUpToAt).getTime() : 0;
  const myLast = [...messages].reverse().find((m) => m.senderId === meId);
  const myLastSeen =
    myLast && seenTime >= new Date(myLast.createdAt).getTime() && !myLast.id.startsWith("temp-");

  let lastDay = "";

  return (
    <div className="flex flex-col">
      <div className="mb-1 flex items-center gap-2 text-[12.5px]">
        <span
          className={`inline-block h-[8px] w-[8px] rounded-full ${
            online ? "bg-olive" : "bg-line-strong"
          }`}
          style={online ? { boxShadow: "0 0 0 3px var(--color-olive-tint)" } : undefined}
          aria-hidden
        />
        <span className={online ? "font-semibold text-olive" : "text-muted"}>
          {online ? "Online" : fmtLastSeen(lastSeenAt)}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex max-h-[58vh] min-h-[240px] flex-col gap-2.5 overflow-y-auto py-2"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-[13.5px] text-muted">No messages yet — say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === meId;
            const day = new Date(m.createdAt).toDateString();
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id}>
                {showDay ? (
                  <div className="my-3 text-center text-[11.5px] uppercase tracking-[0.08em] text-muted">
                    {dayLabel(m.createdAt)}
                  </div>
                ) : null}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] px-3.5 py-2 text-[14px] leading-[1.5] ${
                      mine ? "bg-brick" : "border border-line bg-card text-ink-2"
                    }`}
                    style={mine ? { color: "#faf8f3" } : undefined}
                    title={dateTime(m.createdAt)}
                  >
                    <span className="whitespace-pre-wrap break-words">{m.body}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {partnerTyping ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 border border-line bg-card px-3 py-2.5">
              <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
            </div>
          </div>
        ) : null}
      </div>

      {myLastSeen ? (
        <div className="mt-0.5 text-right text-[11.5px] text-muted">Seen</div>
      ) : myLast && !myLast.id.startsWith("temp-") ? (
        <div className="mt-0.5 text-right text-[11.5px] text-muted">Delivered</div>
      ) : null}

      <div className="mt-4 border-t border-line pt-4">
        {other.suspended ? (
          <p className="text-[13px] text-muted">This account is suspended and can&apos;t receive messages.</p>
        ) : (
          <form
            action={send}
            className="flex items-end gap-2.5"
          >
            <textarea
              value={value}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder="Write a message…"
              aria-label="Write a message"
              className="flex-1 resize-none"
            />
            <button
              type="submit"
              disabled={sending || !value.trim()}
              className="cursor-pointer whitespace-nowrap border-none bg-brick px-5 py-2.5 text-[13px] font-semibold disabled:opacity-40"
              style={{ color: "#faf8f3" }}
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Merge polled messages, skipping ones already present by id and reconciling
// any pending optimistic bubble (same sender + body) into its real row rather
// than appending a duplicate. Returns the original array if nothing changed.
function mergeIncoming(prev: Msg[], incoming: Msg[]): Msg[] {
  let result = prev;
  let changed = false;
  for (const m of incoming) {
    if (result.some((x) => x.id === m.id)) continue;
    const tIdx = result.findIndex(
      (x) => x.id.startsWith("temp-") && x.senderId === m.senderId && x.body === m.body,
    );
    if (tIdx >= 0) {
      result = result.map((x, i) => (i === tIdx ? m : x));
    } else {
      result = [...result, m];
    }
    changed = true;
  }
  return changed ? result : prev;
}

// Monotonic-ish local id source; avoids Date.now() lint in shared code paths.
function now() {
  return Math.floor(performance.now());
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-[6px] w-[6px] rounded-full bg-muted"
      style={{ animation: "typingBlink 1s infinite", animationDelay: `${delay}s` }}
    />
  );
}
