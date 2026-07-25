import { db } from "@/lib/db";
import { fileExt, fileSize, fullDate, viewableKind } from "@/lib/format";
import { addMeetingAction, addResourceAction } from "@/actions/projects";
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
    include: {
      author: { select: { name: true } },
      resources: { orderBy: { createdAt: "asc" } },
    },
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
            {m.resources.length > 0 ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                  Attachments
                </span>
                {m.resources.map((r) => (
                  <a
                    key={r.id}
                    href={
                      r.filePath && viewableKind(fileExt(r.filePath))
                        ? `/resources/${r.id}`
                        : r.filePath
                          ? `/api/resources/${r.id}/download`
                          : r.url ?? "#"
                    }
                    className="border border-line bg-tint px-2.5 py-1 text-[12px] font-medium no-underline hover:border-brick hover:text-brick hover:no-underline"
                  >
                    {r.title}
                    {r.fileSize ? <span className="text-muted"> · {fileSize(r.fileSize)}</span> : null}
                  </a>
                ))}
              </div>
            ) : null}

            {access.canManage ? (
              <Details label="+ Attach a file to this meeting">
                <form action={addResourceAction} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="meetingId" value={m.id} />
                  <input type="hidden" name="kind" value="AUTO" />
                  <Field label="Title" className="min-w-[200px] flex-1">
                    <input name="title" required placeholder="Slides, agenda, recording…" />
                  </Field>
                  <Field label="File" className="min-w-[220px] flex-1">
                    <input type="file" name="file" required />
                  </Field>
                  <button
                    type="submit"
                    className="mb-0.5 cursor-pointer border-none bg-brick px-4 py-2.5 text-[12.5px] font-semibold"
                    style={{ color: "#faf8f3" }}
                  >
                    Attach
                  </button>
                </form>
              </Details>
            ) : null}

            <div className="text-[12.5px] text-muted">Notes by {m.author.name}</div>
          </Card>
        ))
      )}
    </div>
  );
}
