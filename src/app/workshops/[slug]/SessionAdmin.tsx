import { addSessionAction } from "@/actions/workshops";
import { Field } from "@/components/ui";
import { Details } from "@/components/Collapse";

export function SessionAdmin({ workshopId }: { workshopId: string }) {
  return (
    <Details label="+ Add session">
      <form action={addSessionAction} className="flex flex-col gap-3.5">
        <input type="hidden" name="workshopId" value={workshopId} />
        <Field label="Session title">
          <input name="title" required placeholder="DataFrames: loading and cleaning" />
        </Field>
        <Field label="Description" hint="optional">
          <textarea name="description" rows={2} />
        </Field>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Date & time">
            <input name="scheduledAt" type="datetime-local" required />
          </Field>
          <Field label="Duration (min)">
            <input name="durationMin" type="number" defaultValue={90} min={15} />
          </Field>
          <Field label="Meeting link" hint="optional">
            <input name="meetingUrl" placeholder="https://meet…" />
          </Field>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
            style={{ color: "#faf8f3" }}
          >
            Add session
          </button>
        </div>
      </form>
    </Details>
  );
}
