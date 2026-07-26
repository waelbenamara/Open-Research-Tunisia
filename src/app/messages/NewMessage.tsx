"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";

type Person = {
  id: string;
  name: string;
  headline: string | null;
  avatarColor: string;
  avatarSrc: string | null;
};

/** "New message" — search people and open a conversation, without leaving
 *  the messages page. */
export function NewMessage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced search.
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setPeople([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setPeople(data.people ?? []);
      } catch {
        setPeople([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-none bg-brick px-4 py-2 text-[13px] font-semibold"
        style={{ color: "#faf8f3" }}
      >
        New message
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[340px] max-w-[86vw] border border-line bg-card shadow-[0_12px_36px_-16px_rgba(33,29,22,0.4)]">
          <div className="border-b border-line-soft p-2.5">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people by name…"
              aria-label="Search people to message"
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {q.trim() === "" ? (
              <p className="px-4 py-5 text-center text-[12.5px] text-muted">
                Type a name to find someone.
              </p>
            ) : loading ? (
              <p className="px-4 py-5 text-center text-[12.5px] text-muted">Searching…</p>
            ) : people.length === 0 ? (
              <p className="px-4 py-5 text-center text-[12.5px] text-muted">No one matches “{q}”.</p>
            ) : (
              people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => router.push(`/messages/${p.id}`)}
                  className="flex w-full cursor-pointer items-center gap-3 border-none border-b border-line-soft bg-transparent px-3 py-2.5 text-left last:border-b-0 hover:bg-tint"
                >
                  <Avatar name={p.name} color={p.avatarColor} src={p.avatarSrc} size={34} />
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-ink">{p.name}</div>
                    {p.headline ? (
                      <div className="truncate text-[12px] text-muted">{p.headline}</div>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
