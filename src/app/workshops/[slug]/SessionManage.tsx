"use client";

import { useActionState } from "react";
import { deleteSessionAction, editSessionAction } from "@/actions/workshops";
import { Field } from "@/components/ui";
import { Details } from "@/components/Collapse";
import { LocalDateTimeInput } from "@/components/LocalDateTimeInput";

/** Full per-session management for facilitators: edit title/time/duration/
 *  description/links, or delete the session. Shows inline saved/error feedback
 *  so a save never feels like it did nothing. */
export function SessionManage({
  session,
}: {
  session: {
    id: string;
    title: string;
    description: string;
    scheduledAtISO: string; // UTC ISO
    durationMin: number;
    meetingUrl: string | null;
    recordingUrl: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(editSessionAction, null);

  return (
    <div className="border-t border-line-soft pt-2.5">
      <Details label="Manage session">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="sessionId" value={session.id} />
          <div className="grid gap-3 sm:grid-cols-[1fr_190px_110px]">
            <Field label="Title">
              <input name="title" defaultValue={session.title} required />
            </Field>
            <Field label="Date & time" hint="your local time">
              <LocalDateTimeInput name="scheduledAt" defaultISO={session.scheduledAtISO} />
            </Field>
            <Field label="Duration (min)">
              <input name="durationMin" type="number" min={15} max={480} step={15} defaultValue={session.durationMin} />
            </Field>
          </div>
          <Field label="Description" hint="optional">
            <textarea name="description" rows={2} defaultValue={session.description} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Live meeting link">
              <input name="meetingUrl" defaultValue={session.meetingUrl ?? ""} placeholder="https://meet…" />
            </Field>
            <Field label="Recording link">
              <input name="recordingUrl" defaultValue={session.recordingUrl ?? ""} placeholder="https://…" />
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
              className="cursor-pointer border-none bg-brick px-5 py-2 text-[13px] font-semibold disabled:opacity-60"
              style={{ color: "#faf8f3" }}
            >
              {pending ? "Saving…" : "Save session"}
            </button>
          </div>
        </form>

        <form action={deleteSessionAction} className="mt-2 border-t border-line-soft pt-2">
          <input type="hidden" name="sessionId" value={session.id} />
          <button
            type="submit"
            className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-muted hover:text-brick"
          >
            Delete this session
          </button>
        </form>
      </Details>
    </div>
  );
}
