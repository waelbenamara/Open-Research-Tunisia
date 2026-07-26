"use client";

import { useActionState, useState } from "react";
import { updateWorkshopAction } from "@/actions/workshops";
import { Button, Field, FormError, FormSuccess, SectionLabel } from "@/components/ui";
import { LANGUAGES, WORKSHOP_FORMATS, WORKSHOP_LEVELS, WORKSHOP_STATUSES } from "@/lib/enums";
import { MarkdownField } from "@/components/MarkdownField";

export type WorkshopValues = {
  id: string;
  title: string;
  summary: string;
  about: string;
  level: string;
  outcomes: string; // newline-joined
  prerequisites: string;
  startDate: string; // yyyy-mm-dd
  seats: number;
  format: string;
  location: string;
  language: string;
  status: string;
  certificateEnabled: boolean;
  attendanceThreshold: number;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft — hidden from everyone",
  OPEN: "Open — accepting enrolments",
  RUNNING: "Running — in progress",
  COMPLETED: "Completed — finished",
};

export function WorkshopEditForm({ values }: { values: WorkshopValues }) {
  const [state, action, pending] = useActionState(updateWorkshopAction, null);
  const [format, setFormat] = useState(values.format);
  const [certificates, setCertificates] = useState(values.certificateEnabled);
  const [threshold, setThreshold] = useState(values.attendanceThreshold);
  const inPerson = format !== "ONLINE";

  return (
    <form action={action} className="flex flex-col gap-7">
      <input type="hidden" name="workshopId" value={values.id} />
      <FormError>{state?.error}</FormError>
      <FormSuccess>{state?.success}</FormSuccess>

      <section className="flex flex-col gap-4">
        <SectionLabel>The basics</SectionLabel>
        <Field label="Title">
          <input name="title" required defaultValue={values.title} />
        </Field>
        <Field label="One-paragraph summary">
          <textarea name="summary" rows={3} required defaultValue={values.summary} />
        </Field>
        <Field label="About" hint="the fuller description, in Markdown">
          <MarkdownField name="about" defaultValue={values.about} rows={6} />
        </Field>
        <Field label="What you'll learn" hint="one outcome per line">
          <textarea name="outcomes" rows={4} defaultValue={values.outcomes} />
        </Field>
        <Field label="Prerequisites" hint="optional">
          <input name="prerequisites" defaultValue={values.prerequisites} />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Logistics</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Level">
            <select name="level" defaultValue={values.level}>
              {WORKSHOP_LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input name="startDate" type="date" defaultValue={values.startDate} />
          </Field>
          <Field label="Seats">
            <input name="seats" type="number" min={1} defaultValue={values.seats} />
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
              <input name="location" defaultValue={values.location} placeholder="Campus or venue" />
            </Field>
          ) : null}
          <Field label="Language">
            <select name="language" defaultValue={values.language}>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Status" hint="controls whether it's public and enrolling">
          <select name="status" defaultValue={values.status}>
            {WORKSHOP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel>Certification</SectionLabel>
        <label className="flex items-center gap-2.5 text-[14px]">
          <input
            type="checkbox"
            name="certificateEnabled"
            checked={certificates}
            onChange={(e) => setCertificates(e.target.checked)}
          />
          Issue verifiable certificates for this workshop
        </label>
        {certificates ? (
          <Field label={`Attendance required: ${threshold}%`} hint="certificates record attendance, not an exam">
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
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
