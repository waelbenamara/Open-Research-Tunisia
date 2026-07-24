"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createWorkshopAction } from "@/actions/workshops";
import { Button, Field, FormError, SectionLabel } from "@/components/ui";
import { LANGUAGES, WORKSHOP_FORMATS, WORKSHOP_LEVELS } from "@/lib/enums";

const LEVEL_HINTS: Record<string, string> = {
  Beginner: "No prior experience assumed — start from zero.",
  Intermediate: "Assumes the basics; builds real fluency.",
  Advanced: "For people already working in the area.",
};

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Same weekday and time, one week later — the usual cadence. */
function plusOneWeek(local: string) {
  const d = new Date(local);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 7);
  return toLocalInput(d);
}

type SessionDraft = { title: string; at: string; durationMin: string };

export function WorkshopForm({ projects }: { projects: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(createWorkshopAction, null);

  const [format, setFormat] = useState("ONLINE");
  const [level, setLevel] = useState("Beginner");
  const [startDate, setStartDate] = useState("");
  const [certificates, setCertificates] = useState(true);
  const [threshold, setThreshold] = useState(75);
  const [outcomes, setOutcomes] = useState<string[]>([""]);
  const [sessions, setSessions] = useState<SessionDraft[]>([
    { title: "", at: "", durationMin: "90" },
  ]);

  const inPerson = format !== "ONLINE";

  function setSession(i: number, patch: Partial<SessionDraft>) {
    setSessions((prev) => {
      const next = prev.map((s, j) => (j === i ? { ...s, ...patch } : s));
      // First session scheduled → default the workshop start date to match.
      if (i === 0 && patch.at && !startDate) setStartDate(patch.at.slice(0, 10));
      return next;
    });
  }

  function addSession() {
    const last = sessions[sessions.length - 1];
    setSessions([
      ...sessions,
      { title: "", at: last?.at ? plusOneWeek(last.at) : "", durationMin: last?.durationMin ?? "90" },
    ]);
  }

  return (
    <form action={action} className="flex flex-col gap-7">
      <input
        type="hidden"
        name="outcomes"
        value={outcomes.map((o) => o.trim()).filter(Boolean).join("\n")}
      />
      <input
        type="hidden"
        name="sessionsJson"
        value={JSON.stringify(
          sessions
            .map((s) => ({
              title: s.title.trim(),
              at: s.at,
              durationMin: Number(s.durationMin) || 90,
            }))
            .filter((s) => s.title || s.at),
        )}
      />
      <FormError>{state?.error}</FormError>

      <section className="flex flex-col gap-4">
        <SectionLabel>The basics</SectionLabel>
        <Field label="Title">
          <input name="title" required placeholder="Python for Data Analysis: Zero to Pandas" />
        </Field>
        <Field label="One-paragraph summary">
          <textarea
            name="summary"
            rows={3}
            required
            placeholder="Four hands-on sessions taking you from no code to cleaning and exploring a real dataset…"
          />
        </Field>
        <Field label="About" hint="optional — the fuller description">
          <textarea name="about" rows={4} />
        </Field>
        <Field label="What you'll learn" hint="one concrete outcome per line — people enrol for these">
          <div className="flex flex-col gap-2">
            {outcomes.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-right text-[13px] text-muted">{i + 1}.</span>
                <input
                  value={o}
                  onChange={(e) =>
                    setOutcomes(outcomes.map((x, j) => (j === i ? e.target.value : x)))
                  }
                  placeholder={
                    i === 0 ? "Load, clean and reshape tabular data with pandas" : "Another outcome"
                  }
                  aria-label={`Outcome ${i + 1}`}
                  className="flex-1"
                />
                <button
                  type="button"
                  aria-label={`Remove outcome ${i + 1}`}
                  className="text-[18px] text-muted hover:text-brick disabled:opacity-30"
                  onClick={() => setOutcomes(outcomes.filter((_, j) => j !== i))}
                  disabled={outcomes.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOutcomes([...outcomes, ""])}
                disabled={outcomes.length >= 10}
              >
                + Add outcome
              </Button>
            </div>
          </div>
        </Field>
        <Field label="Prerequisites" hint="optional — be honest, it saves people's evenings">
          <input name="prerequisites" placeholder="None. A laptop and two hours a week." />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Sessions</SectionLabel>
        <p className="-mt-2 text-[13px] leading-relaxed text-ink-4">
          Scheduling the first session fills the start date for you; each added session defaults to
          one week after the last. You can add sessions, live links and recordings later too.
        </p>
        <div className="flex flex-col gap-2">
          {sessions.map((s, i) => (
            <div key={i} className="grid items-center gap-2 sm:grid-cols-[36px_1.4fr_215px_84px_36px]">
              <span className="text-[12.5px] font-semibold text-muted">S{i + 1}</span>
              <input
                value={s.title}
                onChange={(e) => setSession(i, { title: e.target.value })}
                placeholder={i === 0 ? "Setup, notebooks, and Python basics" : `Session ${i + 1} title`}
                aria-label={`Session ${i + 1} title`}
              />
              <input
                type="datetime-local"
                value={s.at}
                onChange={(e) => setSession(i, { at: e.target.value })}
                aria-label={`Session ${i + 1} date and time`}
              />
              <input
                type="number"
                min={15}
                max={480}
                step={15}
                value={s.durationMin}
                onChange={(e) => setSession(i, { durationMin: e.target.value })}
                aria-label={`Session ${i + 1} duration in minutes`}
                title="Minutes"
              />
              <button
                type="button"
                aria-label={`Remove session ${i + 1}`}
                className="text-[18px] text-muted hover:text-brick disabled:opacity-30"
                onClick={() => setSessions(sessions.filter((_, j) => j !== i))}
                disabled={sessions.length === 1}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addSession}
            disabled={sessions.length >= 20}
          >
            + Add session
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Logistics</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Level">
            <select name="level" value={level} onChange={(e) => setLevel(e.target.value)}>
              {WORKSHOP_LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <div className="mt-1 text-[12px] text-muted">{LEVEL_HINTS[level]}</div>
          </Field>
          <Field label="Start date">
            <input
              name="startDate"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="Seats">
            <input name="seats" type="number" min={1} defaultValue={30} required />
          </Field>
        </div>
        <div className={`grid gap-4 ${inPerson ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <Field label="Format">
            <select name="format" value={format} onChange={(e) => setFormat(e.target.value)}>
              {WORKSHOP_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f === "ONLINE" ? "Live online" : f === "IN_PERSON" ? "In person" : "Hybrid"}
                </option>
              ))}
            </select>
          </Field>
          {inPerson ? (
            <Field label="Location">
              <input name="location" required placeholder="Campus or venue" />
            </Field>
          ) : null}
          <Field label="Language">
            <select name="language" defaultValue="English">
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Certification &amp; links</SectionLabel>
        <label className="flex items-center gap-2.5 text-[14px]">
          <input
            type="checkbox"
            name="certificateEnabled"
            checked={certificates}
            onChange={(e) => setCertificates(e.target.checked)}
          />
          Issue verifiable certificates for this workshop
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {certificates ? (
            <Field
              label={`Attendance required: ${threshold}%`}
              hint="certificates record attendance, not an exam"
            >
              <input
                name="attendanceThreshold"
                type="range"
                min={0}
                max={100}
                step={5}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </Field>
          ) : (
            <input type="hidden" name="attendanceThreshold" value={threshold} />
          )}
          <Field label="Supports project" hint="the project this workshop feeds contributors into">
            <select name="linkedProjectId" defaultValue="">
              <option value="">— none —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Publishing…" : "Publish workshop"}
        </Button>
      </div>
    </form>
  );
}
