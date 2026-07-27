"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleReactionAction } from "@/actions/reactions";
import { REACTIONS, REACTION_EMOJI, REACTION_LABEL } from "@/lib/reactions";

/** A compact, optimistic reaction control for comments and messages. */
export function Reactions({
  targetType,
  targetId,
  counts: initialCounts,
  myReaction: initialMine,
}: {
  targetType: string;
  targetId: string;
  counts: Record<string, number>;
  myReaction: string | null;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<string | null>(initialMine);
  const [open, setOpen] = useState(false);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const present = REACTIONS.filter((r) => (counts[r.kind] ?? 0) > 0);

  function react(kind: string) {
    setOpen(false);
    const next = { ...counts };
    let nextMine: string | null;
    if (mine === kind) {
      next[kind] = Math.max(0, (next[kind] ?? 0) - 1);
      nextMine = null;
    } else {
      if (mine) next[mine] = Math.max(0, (next[mine] ?? 0) - 1);
      next[kind] = (next[kind] ?? 0) + 1;
      nextMine = kind;
    }
    setCounts(next);
    setMine(nextMine);

    const fd = new FormData();
    fd.set("targetType", targetType);
    fd.set("targetId", targetId);
    fd.set("kind", kind);
    toggleReactionAction(fd)
      .then(() => router.refresh())
      .catch(() => {
        setCounts(initialCounts);
        setMine(initialMine);
      });
  }

  return (
    <span className="relative inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => (mine ? react(mine) : setOpen((v) => !v))}
        onMouseEnter={() => setOpen(true)}
        className={`cursor-pointer border-none bg-transparent p-0 text-[11.5px] font-semibold ${
          mine ? "text-brick" : "text-muted hover:text-brick"
        }`}
      >
        {mine ? `${REACTION_EMOJI[mine]} ${REACTION_LABEL[mine]}` : "React"}
      </button>

      {total > 0 ? (
        <span className="inline-flex items-center gap-0.5 text-[11.5px] text-muted">
          {present.slice(0, 3).map((r) => (
            <span key={r.kind}>{r.emoji}</span>
          ))}
          <span className="ml-0.5">{total}</span>
        </span>
      ) : null}

      {open ? (
        <>
          <span className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <span
            className="animate-popover absolute bottom-[22px] left-0 z-20 flex gap-0.5 rounded-full border border-line bg-card px-1.5 py-1 shadow-lg"
            onMouseLeave={() => setOpen(false)}
          >
            {REACTIONS.map((r) => (
              <button
                key={r.kind}
                type="button"
                title={r.label}
                onClick={() => react(r.kind)}
                className={`grid h-7 w-7 cursor-pointer place-items-center rounded-full border-none bg-transparent text-[16px] transition-transform hover:scale-125 ${
                  mine === r.kind ? "bg-brick-tint" : ""
                }`}
              >
                {r.emoji}
              </button>
            ))}
          </span>
        </>
      ) : null}
    </span>
  );
}
