"use client";

import { useState } from "react";
import { deleteProjectEventAction } from "@/actions/projects";

export type CalItem = {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO
  kind: "EVENT" | "DEADLINE" | "MILESTONE" | "MEETING" | "TASK";
  source: "event" | "task" | "meeting";
  deletable: boolean;
};

const KIND_STYLE: Record<CalItem["kind"], { bg: string; fg: string; label: string }> = {
  EVENT: { bg: "#e8e3f0", fg: "#4f4370", label: "Event" },
  DEADLINE: { bg: "#f0ddd6", fg: "#8a3325", label: "Deadline" },
  MILESTONE: { bg: "#e4ecdb", fg: "#3e5730", label: "Milestone" },
  MEETING: { bg: "#f4ead2", fg: "#7a5b16", label: "Meeting" },
  TASK: { bg: "#f2eee3", fg: "#57503f", label: "Task due" },
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function CalendarView({ items, canManage }: { items: CalItem[]; canManage: boolean }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const byDay = new Map<string, CalItem[]>();
  for (const it of items) {
    const d = new Date(it.date);
    const key = ymd(d);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(it);
  }

  // Build the month grid (Mon-first).
  const first = new Date(cursor.y, cursor.m, 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.y, cursor.m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const upcoming = [...items]
    .filter((it) => new Date(it.date).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  const move = (delta: number) => {
    const m = cursor.m + delta;
    setCursor({ y: cursor.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="font-serif text-[20px] font-medium">
          {MONTHS[cursor.m]} {cursor.y}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous month"
            className="cursor-pointer border border-line-input bg-card px-3 py-1.5 text-[13px] text-ink-4 hover:border-brick hover:text-brick"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}
            className="cursor-pointer border border-line-input bg-card px-3 py-1.5 text-[12.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next month"
            className="cursor-pointer border border-line-input bg-card px-3 py-1.5 text-[13px] text-ink-4 hover:border-brick hover:text-brick"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-line">
        {DOW.map((d) => (
          <div
            key={d}
            className="border-b border-r border-line bg-sand px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted"
          >
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          const isToday = date && ymd(date) === ymd(today);
          const dayItems = date ? byDay.get(ymd(date)) ?? [] : [];
          return (
            <div
              key={i}
              className={`min-h-[92px] border-b border-r border-line p-1.5 ${
                date ? "bg-card" : "bg-sand/40"
              }`}
            >
              {date ? (
                <>
                  <div
                    className={`mb-1 inline-grid h-[22px] min-w-[22px] place-items-center px-1 text-[12px] ${
                      isToday ? "bg-brick font-bold text-paper" : "text-ink-4"
                    }`}
                    style={isToday ? { color: "#faf8f3" } : undefined}
                  >
                    {date.getDate()}
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayItems.slice(0, 3).map((it) => {
                      const s = KIND_STYLE[it.kind];
                      return (
                        <div
                          key={it.id}
                          title={it.title}
                          className="truncate px-1.5 py-0.5 text-[10.5px] font-medium"
                          style={{ background: s.bg, color: s.fg }}
                        >
                          {it.title}
                        </div>
                      );
                    })}
                    {dayItems.length > 3 ? (
                      <div className="px-1 text-[10px] text-muted">+{dayItems.length - 3} more</div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <div>
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Upcoming
        </div>
        {upcoming.length === 0 ? (
          <p className="text-[13.5px] text-muted">Nothing scheduled ahead.</p>
        ) : (
          <div className="flex flex-col">
            {upcoming.map((it) => {
              const s = KIND_STYLE[it.kind];
              const d = new Date(it.date);
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-3 border-b border-line-soft py-2.5"
                >
                  <div className="w-[52px] shrink-0 text-center">
                    <div className="font-serif text-[18px] font-medium leading-none">{d.getDate()}</div>
                    <div className="text-[10.5px] uppercase text-muted">{MONTHS[d.getMonth()].slice(0, 3)}</div>
                  </div>
                  <span
                    className="shrink-0 px-2 py-0.5 text-[10.5px] font-semibold uppercase"
                    style={{ background: s.bg, color: s.fg }}
                  >
                    {s.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{it.title}</div>
                    <div className="text-[12px] text-muted">
                      {d.toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit" })}
                      {it.description ? ` · ${it.description}` : ""}
                    </div>
                  </div>
                  {canManage && it.deletable ? (
                    <form action={deleteProjectEventAction}>
                      <input type="hidden" name="eventId" value={it.id} />
                      <button
                        type="submit"
                        className="cursor-pointer border-none bg-transparent text-[12px] text-muted hover:text-brick"
                        aria-label={`Remove ${it.title}`}
                      >
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
