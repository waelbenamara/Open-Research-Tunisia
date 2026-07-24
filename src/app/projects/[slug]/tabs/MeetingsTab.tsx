import { db } from "@/lib/db";
import { fullDate } from "@/lib/format";
import { addMeetingAction } from "@/actions/projects";
import { Card, EmptyState, Field } from "@/components/ui";
import { Details } from "@/components/Collapse";
import type { ProjectAccess } from "@/lib/permissions";

export async function MeetingsTab({
  projectId,
  access,
}: {
  projectId: string;
  access: ProjectAccess;
}) {
  if (!access.canSeeInternal) {
    return (
      <EmptyState
        title="Meeting notes are for project members."
        hint="Apply to contribute and you'll see every decision the team has made."
      />
    );
  }

  const meetings = await db.meeting.findMany({
    where: { projectId },
    include: { author: { select: { name: true } } },
    orderBy: { heldAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-3">
      {access.canManage ? (
        <Details label="+ Add meeting notes">
          <form action={addMeetingAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="grid gap-3.5 sm:grid-cols-[1fr_180px_120px]">
              <Field label="Title">
                <input name="title" required placeholder="Weekly sync #10" />
              </Field>
              <Field label="Date">
                <input name="heldAt" type="date" />
              </Field>
              <Field label="Attendees">
                <input name="attendeesCount" type="number" min={0} defaultValue={0} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea name="notes" rows={4} required placeholder="What was discussed…" />
            </Field>
            <Field label="Decisions & action items" hint="one per line">
              <textarea
                name="decisions"
                rows={3}
                placeholder="Adopt SPI-3 as the target variable&#10;Rim to prep comparison before Friday"
              />
            </Field>
            <div className="flex justify-end">
              <button
                type="submit"
                className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                style={{ color: "#faf8f3" }}
              >
                Save notes
              </button>
            </div>
          </form>
        </Details>
      ) : null}

      {meetings.length === 0 ? (
        <EmptyState title="No meetings recorded yet." />
      ) : (
        meetings.map((m) => (
          <Card key={m.id} className="flex flex-col gap-2 px-[22px] py-5">
            <div className="flex flex-wrap items-baseline gap-3.5">
              <div className="font-serif text-[18px] font-medium">{m.title}</div>
              <div className="flex-1" />
              <div className="text-[12.5px] text-muted">
                {fullDate(m.heldAt)} · {m.attendeesCount} attended
              </div>
            </div>
            <div className="whitespace-pre-line text-[14px] leading-[1.6] text-ink-3 pretty">
              {m.notes}
            </div>
            {m.decisions ? (
              <div className="mt-1 border-l-2 border-brick pl-3.5">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Decisions &amp; actions
                </div>
                <ul className="flex flex-col gap-1">
                  {m.decisions
                    .split("\n")
                    .filter(Boolean)
                    .map((d, i) => (
                      <li key={i} className="text-[13.5px] leading-[1.5] text-ink-2">
                        {d}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
            <div className="text-[12.5px] text-muted">Notes by {m.author.name}</div>
          </Card>
        ))
      )}
    </div>
  );
}
