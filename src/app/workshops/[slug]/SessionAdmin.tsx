"use client";

import { useActionState } from "react";
import { addSessionAction } from "@/actions/workshops";
import { Field } from "@/components/ui";
import { Details } from "@/components/Collapse";
import { LocalDateTimeInput } from "@/components/LocalDateTimeInput";

export function SessionAdmin({ workshopId }: { workshopId: string }) {
  const [state, formAction, pending] = useActionState(addSessionAction, null);

  return (
    <Details label="+ Add session">
      <form action={formAction} className="flex flex-col gap-3.5">
        <input type="hidden" name="workshopId" value={workshopId} />
        <Field label="Session title">
          <input name="title" required placeholder="DataFrames: loading and cleaning" />
        </Field>
        <Field label="Description" hint="optional">
          <textarea name="description" rows={2} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Date & time" hint="your local time">
            <LocalDateTimeInput name="scheduledAt" required />
          </Field>
          <Field label="Duration (min)">
            <input name="durationMin" type="number" defaultValue={90} min={15} />
          </Field>
          <Field label="Meeting link" hint="optional">
            <input name="meetingUrl" placeholder="https://meet…" />
          </Field>
        </div>

        {state ? (
          <div
            role="status"
            className="border px-3 py-2 text-[12.5px] font-medium"
            style={
              state.ok
                ? { borderColor: "#bcd0a8", background: "#e4ecdb", color: "#3e5730" }
                : { borderColor: "#e6b8b0", background: "#f6e3df", color: "#8a3325" }
            }
          >
            {state.ok ? "✓ " : "⚠ "}
            {state.message}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted">Times are shown in this device&apos;s timezone.</span>
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold disabled:opacity-60"
            style={{ color: "#faf8f3" }}
          >
            {pending ? "Adding…" : "Add session"}
          </button>
        </div>
      </form>
    </Details>
  );
}
