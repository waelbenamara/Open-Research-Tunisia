"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleReactionAction } from "@/actions/feed";
import { REACTIONS, REACTION_EMOJI, REACTION_LABEL } from "@/lib/reactions";

export function ReactionBar({
  postId,
  counts: initialCounts,
  myReaction: initialMine,
  commentCount,
}: {
  postId: string;
  counts: Record<string, number>;
  myReaction: string | null;
  commentCount: number;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<string | null>(initialMine);
  const [pickerOpen, setPickerOpen] = useState(false);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const present = REACTIONS.filter((r) => (counts[r.kind] ?? 0) > 0);

  function react(kind: string) {
    setPickerOpen(false);
    // Optimistic update.
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
    fd.set("postId", postId);
    fd.set("kind", kind);
    toggleReactionAction(fd)
      .then(() => router.refresh())
      .catch(() => {
        // Roll back on failure.
        setCounts(initialCounts);
        setMine(initialMine);
      });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {total > 0 || commentCount > 0 ? (
        <div className="flex items-center justify-between px-1 text-[12px] text-muted">
          <span className="flex items-center gap-1">
            {present.length > 0 ? (
              <>
                <span className="flex">
                  {present.slice(0, 3).map((r) => (
                    <span key={r.kind} className="-ml-0.5 first:ml-0">
                      {r.emoji}
                    </span>
                  ))}
                </span>
                <span>{total}</span>
              </>
            ) : null}
          </span>
          {commentCount > 0 ? (
            <span>
              {commentCount} comment{commentCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="relative border-t border-line-soft pt-1.5">
        {pickerOpen ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
            <div className="animate-popover absolute bottom-[38px] left-0 z-20 flex gap-1 rounded-full border border-line bg-card px-2 py-1.5 shadow-lg">
              {REACTIONS.map((r) => (
                <button
                  key={r.kind}
                  type="button"
                  title={r.label}
                  onClick={() => react(r.kind)}
                  className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full border-none bg-transparent text-[20px] transition-transform hover:scale-125 ${
                    mine === r.kind ? "bg-brick-tint" : ""
                  }`}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => (mine ? react(mine) : setPickerOpen((v) => !v))}
          onMouseEnter={() => setPickerOpen(true)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-transparent px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-tint ${
            mine ? "text-brick" : "text-ink-4"
          }`}
        >
          <span className="text-[15px]">{mine ? REACTION_EMOJI[mine] : "👍"}</span>
          {mine ? REACTION_LABEL[mine] : "React"}
        </button>
      </div>
    </div>
  );
}
