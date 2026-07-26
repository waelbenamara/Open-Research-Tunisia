import { deleteSessionAction, editSessionAction } from "@/actions/workshops";
import { Field } from "@/components/ui";
import { Details } from "@/components/Collapse";

/** Full per-session management for facilitators: edit title/time/duration/
 *  description/links, or delete the session. Rendered inside each session card. */
export function SessionManage({
  session,
}: {
  session: {
    id: string;
    title: string;
    description: string;
    scheduledAtInput: string; // "yyyy-mm-ddThh:mm"
    durationMin: number;
    meetingUrl: string | null;
    recordingUrl: string | null;
  };
}) {
  return (
    <div className="border-t border-line-soft pt-2.5">
      <Details label="Manage session">
        <form action={editSessionAction} className="flex flex-col gap-3">
          <input type="hidden" name="sessionId" value={session.id} />
          <div className="grid gap-3 sm:grid-cols-[1fr_190px_110px]">
            <Field label="Title">
              <input name="title" defaultValue={session.title} required />
            </Field>
            <Field label="Date & time">
              <input name="scheduledAt" type="datetime-local" defaultValue={session.scheduledAtInput} />
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
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted">Times are in this device&apos;s timezone.</span>
            <button
              type="submit"
              className="cursor-pointer border-none bg-brick px-5 py-2 text-[13px] font-semibold"
              style={{ color: "#faf8f3" }}
            >
              Save session
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
