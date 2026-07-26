"use client";

import { useEffect, useRef, useState } from "react";
import { markThreadReadAction } from "@/actions/messages";
import { Avatar } from "@/components/ui";
import { dateTime, fileSize, lastSeen as fmtLastSeen } from "@/lib/format";

type Att = { id: string; filename: string; ext: string; size: number };
type Msg = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  attachments: Att[];
  pendingFiles?: number;
};
type Other = {
  id: string;
  name: string;
  avatarColor: string;
  avatarSrc: string | null;
  online: boolean;
  lastSeenAt: string | null;
  suspended: boolean;
};

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

// A small curated palette — enough to be fun, not a full keyboard.
const EMOJIS = [
  "😀", "😂", "🙂", "😍", "😎", "🤔", "😅", "🥳",
  "😭", "😡", "🙏", "👍", "👎", "👏", "🙌", "💪",
  "🔥", "✨", "🎉", "💯", "❤️", "🚀", "✅", "👀",
];

export function LiveThread({
  meId,
  other,
  initialMessages,
  initialSeenUpToAt,
}: {
  meId: string;
  other: Other;
  initialMessages: Msg[];
  initialSeenUpToAt: string | null;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [online, setOnline] = useState(other.online);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(other.lastSeenAt);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [seenUpToAt, setSeenUpToAt] = useState<string | null>(initialSeenUpToAt);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef(0);
  const cursor = useRef<string>(initialMessages[initialMessages.length - 1]?.id ?? "");

  function scrollToBottom(smooth = true) {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }
  useEffect(() => scrollToBottom(false), []);

  // Reading the thread clears its unread messages + notifications (Inbox badge).
  useEffect(() => {
    markThreadReadAction(other.id).catch(() => {});
  }, [other.id]);

  // Auto-grow the textarea.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  // Poll loop — new messages, presence, typing, read receipts.
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
        /* transient */
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
    const t = Date.now();
    if (next && t - lastTypingSent.current > 2500) {
      lastTypingSent.current = t;
      fetch(`/api/messages/${other.id}/typing`, { method: "POST" }).catch(() => {});
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setPending((prev) => [...prev, ...Array.from(list)].slice(0, 10));
  }

  // Insert an emoji at the cursor (falls back to appending).
  function insertEmoji(emoji: string) {
    const ta = taRef.current;
    if (!ta) {
      setValue((v) => v + emoji);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function send(quick?: string) {
    const body = (quick ?? value).trim();
    if ((!body && pending.length === 0) || sending) return;
    setError(null);
    setShowEmoji(false);
    setShowAttach(false);
    setSending(true);

    const tempId = `temp-${Math.floor(performance.now())}`;
    const optimistic: Msg = {
      id: tempId,
      body,
      senderId: meId,
      createdAt: new Date().toISOString(),
      attachments: [],
      pendingFiles: pending.length || undefined,
    };
    setMessages((prev) => [...prev, optimistic]);
    const files = pending;
    setValue("");
    setPending([]);
    setTimeout(() => scrollToBottom(), 20);

    const fd = new FormData();
    fd.set("body", body);
    for (const f of files) fd.append("files", f);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/messages/${other.id}/send`);
    if (files.length > 0) {
      setProgress(0);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      setSending(false);
      setProgress(null);
      let data: { message?: Msg; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.message) {
        const real = data.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === real.id)) return prev.filter((m) => m.id !== tempId);
          return prev.map((m) => (m.id === tempId ? real : m));
        });
        cursor.current = real.id;
        setTimeout(() => scrollToBottom(), 30);
      } else {
        // Roll back the optimistic bubble and surface the reason.
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setValue(body);
        setPending(files);
        setError(data.error ?? "Couldn't send. Try again.");
      }
    };
    xhr.onerror = () => {
      setSending(false);
      setProgress(null);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setValue(body);
      setPending(files);
      setError("Network error — try again.");
    };
    xhr.send(fd);
  }

  const seenTime = seenUpToAt ? new Date(seenUpToAt).getTime() : 0;
  const myLast = [...messages].reverse().find((m) => m.senderId === meId);
  const myLastSeen =
    myLast && seenTime >= new Date(myLast.createdAt).getTime() && !myLast.id.startsWith("temp-");
  const empty = !value.trim() && pending.length === 0;

  let lastDay = "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1 text-[12.5px]">
        <span
          className={`relative inline-block h-[8px] w-[8px] rounded-full ${
            online ? "bg-olive pulse-online" : "bg-line-strong"
          }`}
          aria-hidden
        />
        <span className={online ? "font-semibold text-olive" : "text-muted"}>
          {online ? "Active now" : fmtLastSeen(lastSeenAt)}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-[14px] border border-line p-4"
        style={{
          background:
            "radial-gradient(var(--color-line-soft) 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(180deg, var(--color-card), var(--color-sand))",
        }}
      >
        {messages.length === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-muted">No messages yet — say hello.</p>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === meId;
            const day = new Date(m.createdAt).toDateString();
            const showDay = day !== lastDay;
            lastDay = day;
            const prevSame = i > 0 && messages[i - 1].senderId === m.senderId && !showDay;
            return (
              <div key={m.id}>
                {showDay ? (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full border border-line bg-card/80 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted backdrop-blur-sm">
                      {dayLabel(m.createdAt)}
                    </span>
                  </div>
                ) : null}
                <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine ? (
                    <div className="w-[26px] shrink-0">
                      {!prevSame ? (
                        <Avatar name={other.name} color={other.avatarColor} src={other.avatarSrc} size={26} />
                      ) : null}
                    </div>
                  ) : null}
                  <div className={`flex max-w-[76%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                    {m.body ? (
                      <div
                        className={`animate-msg-pop px-3.5 py-2 text-[14px] leading-[1.5] shadow-sm ${
                          mine
                            ? "rounded-[16px] rounded-br-[5px]"
                            : "rounded-[16px] rounded-bl-[5px] border border-line bg-card text-ink-2"
                        }`}
                        style={
                          mine
                            ? {
                                color: "#faf8f3",
                                background: "linear-gradient(135deg, #9a3b2b, #69241a)",
                              }
                            : undefined
                        }
                        title={dateTime(m.createdAt)}
                      >
                        <span className="whitespace-pre-wrap break-words">{m.body}</span>
                      </div>
                    ) : null}
                    {m.pendingFiles ? (
                      <div className="animate-msg-pop rounded-[14px] border border-dashed border-line-strong bg-card px-3 py-2 text-[12.5px] text-muted">
                        Uploading {m.pendingFiles} file{m.pendingFiles === 1 ? "" : "s"}…
                      </div>
                    ) : null}
                    {m.attachments.map((a) => (
                      <Attachment key={a.id} att={a} mine={mine} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {partnerTyping ? (
          <div className="flex items-end gap-2">
            <div className="w-[26px] shrink-0">
              <Avatar name={other.name} color={other.avatarColor} src={other.avatarSrc} size={26} />
            </div>
            <div className="animate-msg-pop flex items-center gap-1 rounded-[16px] rounded-bl-[5px] border border-line bg-card px-3.5 py-3 shadow-sm">
              <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
            </div>
          </div>
        ) : null}
      </div>

      {myLastSeen ? (
        <div className="mt-1 flex items-center justify-end gap-1 text-[11.5px] font-medium text-olive">
          <CheckCheck /> Seen
        </div>
      ) : myLast && !myLast.id.startsWith("temp-") ? (
        <div className="mt-1 flex items-center justify-end gap-1 text-[11.5px] text-muted">
          <CheckCheck /> Delivered
        </div>
      ) : null}

      {/* Composer */}
      {other.suspended ? (
        <p className="mt-4 text-[13px] text-muted">
          This account is suspended and can&apos;t receive messages.
        </p>
      ) : (
        <div className="mt-4">
          {error ? <div className="mb-1.5 text-[12.5px] font-semibold text-brick">{error}</div> : null}
          {pending.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {pending.map((f, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-tint px-2.5 py-1 text-[12px]"
                >
                  <ClipIcon />
                  <span className="max-w-[180px] truncate">{f.name}</span>
                  <span className="text-muted">{fileSize(f.size)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    className="grid h-[16px] w-[16px] place-items-center rounded-full text-muted hover:bg-brick hover:text-paper"
                    onClick={() => setPending((prev) => prev.filter((_, j) => j !== idx))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="relative">
            {showEmoji ? (
              <>
                {/* Click-away layer. */}
                <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
                <div className="animate-popover absolute bottom-[52px] left-0 z-20 grid w-[264px] grid-cols-8 gap-0.5 rounded-[14px] border border-line bg-card p-2 shadow-lg">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        insertEmoji(e);
                        setShowEmoji(false);
                      }}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-md border-none bg-transparent text-[18px] hover:bg-tint"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {showAttach ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAttach(false)} />
                <div className="animate-popover absolute bottom-[52px] left-0 z-20 w-[214px] rounded-[14px] border border-line bg-card p-1.5 shadow-lg">
                  <AttachOption
                    icon={<CameraIcon />}
                    label="Take photo"
                    onClick={() => {
                      setShowAttach(false);
                      cameraRef.current?.click();
                    }}
                  />
                  <AttachOption
                    icon={<ImageIcon />}
                    label="Photo & video"
                    onClick={() => {
                      setShowAttach(false);
                      mediaRef.current?.click();
                    }}
                  />
                  <AttachOption
                    icon={<ClipIcon size={16} />}
                    label="Upload a file"
                    onClick={() => {
                      setShowAttach(false);
                      fileRef.current?.click();
                    }}
                  />
                </div>
              </>
            ) : null}

            <div className="flex items-end gap-0 rounded-[22px] border border-line-input bg-card px-1 transition-colors focus-within:border-brick focus-within:shadow-[0_0_0_3px_var(--color-brick-tint)]">
              <button
                type="button"
                aria-label="Add photo or file"
                onClick={() => {
                  setShowEmoji(false);
                  setShowAttach((v) => !v);
                }}
                className="grid h-[44px] w-[38px] shrink-0 cursor-pointer place-items-center border-none bg-transparent text-ink-4 transition-transform hover:scale-110 hover:text-brick"
              >
                <PlusIcon />
              </button>
              <button
                type="button"
                aria-label="Add emoji"
                onClick={() => {
                  setShowAttach(false);
                  setShowEmoji((v) => !v);
                }}
                className={`grid h-[44px] w-[38px] shrink-0 cursor-pointer place-items-center border-none bg-transparent text-[18px] transition-transform hover:scale-110 ${
                  showEmoji ? "opacity-100" : "opacity-80 hover:opacity-100"
                }`}
              >
                😊
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <input ref={mediaRef} type="file" accept="image/*,video/*" multiple hidden
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <input ref={fileRef} type="file" multiple hidden
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <textarea
                ref={taRef}
                value={value}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Write a message…"
                aria-label="Write a message"
                className="!m-0 max-h-[160px] flex-1 resize-none !border-none !bg-transparent !py-3 !px-1 !shadow-none focus:!shadow-none"
                style={{ outline: "none" }}
              />
              <button
                type="button"
                onClick={() => send(empty ? "👍" : undefined)}
                disabled={sending}
                aria-label={empty ? "Send a thumbs up" : "Send message"}
                className="m-1.5 grid h-[38px] w-[38px] shrink-0 cursor-pointer place-items-center self-end rounded-full border-none transition-transform hover:enabled:scale-105 active:enabled:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #9a3b2b, #69241a)", color: "#faf8f3" }}
              >
                {sending ? <Spinner /> : empty ? <span className="text-[17px] leading-none">👍</span> : <PaperPlane />}
              </button>
            </div>
          </div>

          {progress !== null ? (
            <div className="mt-1.5 h-[3px] w-full overflow-hidden bg-line-soft">
              <div
                className="h-full bg-brick transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Attachment({ att, mine }: { att: Att; mine: boolean }) {
  const href = `/api/messages/attachments/${att.id}`;
  if (IMAGE_EXTS.has(att.ext)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={href}
          alt={att.filename}
          className="max-h-[220px] max-w-[240px] rounded-[14px] border border-line object-cover shadow-sm"
        />
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex max-w-[260px] items-center gap-2.5 rounded-[14px] px-3 py-2 no-underline shadow-sm ${
        mine ? "bg-brick-dark text-paper" : "border border-line bg-card text-ink-2"
      }`}
      style={mine ? { color: "#faf8f3" } : undefined}
    >
      <FileIcon />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{att.filename}</span>
        <span className={`text-[11.5px] ${mine ? "text-paper/70" : "text-muted"}`}>
          {att.ext.toUpperCase()} · {fileSize(att.size)}
        </span>
      </span>
    </a>
  );
}

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

function ClipIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 11.5l-8.6 8.6a5 5 0 01-7-7l8.6-8.6a3.3 3.3 0 014.7 4.7l-8.6 8.6a1.7 1.7 0 01-2.3-2.3l7.9-7.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M14 3v5h5M14 3H6v18h12V8l-4-5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AttachOption({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-none bg-transparent px-2.5 py-2 text-left text-[13px] font-medium text-ink-3 hover:bg-tint hover:text-ink"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brick-tint text-brick">
        {icon}
      </span>
      {label}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 8.5A1.5 1.5 0 014.5 7h2l1.2-1.8h6.6L15.5 7h4A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5v-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9.5" r="1.5" fill="currentColor" />
      <path d="M4 17l5-5 4 4 2.5-2.5L20 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaperPlane() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12L20 4l-4.5 16-3.8-6.2L4 12z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M1.5 12.5l4 4 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 16.5l1 1 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
