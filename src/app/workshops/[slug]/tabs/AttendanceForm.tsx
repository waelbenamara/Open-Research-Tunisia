"use client";

import { useState } from "react";
import { markAttendanceAction } from "@/actions/workshops";

type Person = { userId: string; name: string };

/**
 * Attendance for one session — clearer than a bare checkbox list: a live
 * present-count, a "mark everyone present" toggle, and an unambiguous save.
 */
export function AttendanceForm({
  sessionId,
  people,
  initiallyPresent,
}: {
  sessionId: string;
  people: Person[];
  initiallyPresent: string[];
}) {
  const [present, setPresent] = useState<Set<string>>(new Set(initiallyPresent));

  const toggle = (id: string) =>
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allPresent = people.length > 0 && present.size === people.length;

  if (people.length === 0) {
    return <div className="text-[13px] text-muted">Nobody is enrolled yet.</div>;
  }

  return (
    <form action={markAttendanceAction} className="flex flex-col gap-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      {/* The checked people submit as `present`. Hidden inputs mirror React state
          so a click updates what's submitted. */}
      {[...present].map((id) => (
        <input key={id} type="hidden" name="present" value={id} />
      ))}

      <div className="flex items-center justify-between border-b border-line-soft pb-2">
        <span className="text-[12.5px] text-ink-4">
          <span className="font-semibold text-ink">{present.size}</span> of {people.length} present
        </span>
        <button
          type="button"
          onClick={() => setPresent(allPresent ? new Set() : new Set(people.map((p) => p.userId)))}
          className="cursor-pointer border-none bg-transparent p-0 text-[12.5px] font-semibold text-brick"
        >
          {allPresent ? "Clear all" : "Mark everyone present"}
        </button>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {people.map((p) => {
          const on = present.has(p.userId);
          return (
            <button
              key={p.userId}
              type="button"
              onClick={() => toggle(p.userId)}
              className="flex items-center gap-2.5 border px-3 py-2 text-left text-[13px]"
              style={{
                borderColor: on ? "#4d6b3c" : "#ddd5c4",
                background: on ? "#e4ecdb" : "#fffefb",
                color: on ? "#3e5730" : "#57503f",
              }}
            >
              <span
                className="grid h-[16px] w-[16px] shrink-0 place-items-center border text-[11px]"
                style={{
                  borderColor: on ? "#4d6b3c" : "#c9bda4",
                  background: on ? "#4d6b3c" : "transparent",
                  color: "#faf8f3",
                }}
              >
                {on ? "✓" : ""}
              </span>
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          className="cursor-pointer border-none bg-brick px-5 py-2 text-[13px] font-semibold"
          style={{ color: "#faf8f3" }}
        >
          Save attendance
        </button>
      </div>
    </form>
  );
}
