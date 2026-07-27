"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./ui";
import { buildMentionBody } from "@/lib/mentions";

type Person = { id: string; name: string; headline: string | null; avatarColor: string; avatarSrc: string | null };
type Mention = { id: string; name: string };

/**
 * A textarea with @-mention autocomplete. It shows readable "@Name" text while
 * typing and, on submit, emits the canonical body ("@[Name](id)") — via an
 * optional hidden input (`name`, for server-action forms) and/or `onChange`.
 * Remount it (change its React `key`) to reset.
 */
export function MentionInput({
  name,
  placeholder,
  rows = 1,
  onChange,
  onSubmit,
  autoFocus,
  className,
}: {
  name?: string;
  placeholder?: string;
  rows?: number;
  onChange?: (canonical: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [active, setActive] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const canonical = buildMentionBody(text, mentions);

  useEffect(() => {
    onChange?.(canonical);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonical]);

  // Debounced people search while an @query is active.
  useEffect(() => {
    if (query === null) {
      setPeople([]);
      return;
    }
    const term = query.trim();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(term || "a")}`);
        const data = await res.json();
        setPeople((data.people ?? []).slice(0, 6));
        setActive(0);
      } catch {
        setPeople([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  function grow() {
    const ta = taRef.current;
    if (!ta || rows > 1) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }

  function detectQuery(value: string, caret: number) {
    const before = value.slice(0, caret);
    const m = before.match(/(?:^|\s)@([^\s@]{0,40})$/);
    setQuery(m ? m[1] : null);
  }

  function onType(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    detectQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
    grow();
  }

  function pick(p: Person) {
    const ta = taRef.current;
    const caret = ta?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const after = text.slice(caret);
    // Replace the trailing "@query" with "@Full Name ".
    const replaced = before.replace(/@([^\s@]{0,40})$/, `@${p.name} `);
    const nextText = replaced + after;
    setText(nextText);
    setMentions((prev) => [...prev, { id: p.id, name: p.name }]);
    setQuery(null);
    setPeople([]);
    requestAnimationFrame(() => {
      ta?.focus();
      const pos = replaced.length;
      ta?.setSelectionRange(pos, pos);
      grow();
    });
  }

  const dropdownOpen = query !== null && people.length > 0;

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (dropdownOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % people.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + people.length) % people.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(people[active]);
        return;
      }
      if (e.key === "Escape") {
        setQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && onSubmit && rows === 1) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="relative w-full">
      {name ? <input type="hidden" name={name} value={canonical} /> : null}
      <textarea
        ref={taRef}
        value={text}
        onChange={onType}
        onKeyDown={onKeyDown}
        rows={rows}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={className ?? "!m-0 w-full resize-none"}
      />
      {dropdownOpen ? (
        <div className="absolute bottom-full left-0 z-30 mb-1 w-[260px] max-w-[90vw] overflow-hidden rounded-[12px] border border-line bg-card shadow-[0_14px_36px_-16px_rgba(33,29,22,0.45)]">
          {people.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3 py-2 text-left ${
                i === active ? "bg-tint" : "hover:bg-tint"
              }`}
            >
              <Avatar name={p.name} color={p.avatarColor} src={p.avatarSrc} size={26} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">{p.name}</span>
                {p.headline ? (
                  <span className="block truncate text-[11.5px] text-muted">{p.headline}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
