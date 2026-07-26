import { db } from "@/lib/db";
import { EVENT_KINDS } from "@/lib/enums";
import { addProjectEventAction } from "@/actions/projects";
import { Field } from "@/components/ui";
import { Details } from "@/components/Collapse";
import type { ProjectAccess } from "@/lib/permissions";
import { CalendarView, type CalItem } from "./CalendarView";

const KIND_LABEL: Record<string, string> = {
  EVENT: "Event",
  DEADLINE: "Deadline",
  MILESTONE: "Milestone",
  MEETING: "Meeting",
};

export async function CalendarTab({
  projectId,
  projectSlug,
  access,
}: {
  projectId: string;
  projectSlug: string;
  access: ProjectAccess;
}) {
  // The calendar merges three sources: explicit calendar events, task due
  // dates, and recorded meetings — so deadlines show up automatically.
  const [events, tasks, meetings] = await Promise.all([
    db.projectEvent.findMany({ where: { projectId }, orderBy: { startAt: "asc" } }),
    db.task.findMany({
      where: { projectId, dueDate: { not: null }, status: { not: "DONE" } },
      select: { id: true, title: true, dueDate: true },
    }),
    db.meeting.findMany({
      where: { projectId },
      select: { id: true, title: true, heldAt: true },
    }),
  ]);

  const items: CalItem[] = [
    ...events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description || undefined,
      date: e.startAt.toISOString(),
      kind: (e.kind as CalItem["kind"]) ?? "EVENT",
      source: "event" as const,
      deletable: true,
    })),
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      title: t.title,
      date: t.dueDate!.toISOString(),
      kind: "TASK" as const,
      source: "task" as const,
      deletable: false,
    })),
    ...meetings.map((m) => ({
      id: `meeting-${m.id}`,
      title: m.title,
      date: m.heldAt.toISOString(),
      kind: "MEETING" as const,
      source: "meeting" as const,
      deletable: false,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      {access.canManage ? (
        <Details label="+ Add to calendar">
          <form action={addProjectEventAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="grid gap-3.5 sm:grid-cols-[1fr_160px]">
              <Field label="Title">
                <input name="title" required placeholder="Submit preprint to arXiv" />
              </Field>
              <Field label="Type">
                <select name="kind" defaultValue="EVENT">
                  {EVENT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="When">
                <input name="startAt" type="datetime-local" required />
              </Field>
              <Field label="Ends" hint="optional">
                <input name="endAt" type="datetime-local" />
              </Field>
            </div>
            <Field label="Note" hint="optional">
              <input name="description" placeholder="Anything the team should know" />
            </Field>
            <div className="flex justify-end">
              <button
                type="submit"
                className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                style={{ color: "#faf8f3" }}
              >
                Add to calendar
              </button>
            </div>
          </form>
        </Details>
      ) : null}

      <CalendarView items={items} canManage={access.canManage} />

      <p className="text-[12px] text-muted">
        Task due dates and meetings appear here automatically alongside events you add.
      </p>
    </div>
  );
}
