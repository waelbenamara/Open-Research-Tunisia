import { db } from "@/lib/db";
import { avatarSrc, shortDate } from "@/lib/format";
import { TASK_STATUSES, CREDIT_ROLES } from "@/lib/enums";
import { TASK_STATUS_COLORS } from "@/lib/theme";
import {
  claimTaskAction,
  createTaskAction,
  deleteTaskAction,
  updateTaskStatusAction,
} from "@/actions/projects";
import { Avatar, Card, EmptyState, Field, Pill, SectionLabel } from "@/components/ui";
import { Details } from "@/components/Collapse";
import type { ProjectAccess } from "@/lib/permissions";

type Member = { userId: string; user: { name: string; avatarColor: string } };

const EFFORT_LABEL: Record<string, string> = { S: "Small", M: "Medium", L: "Large" };

/**
 * The board enforces the credit flow in its buttons: contributors carry a task
 * OPEN → IN_PROGRESS → IN_REVIEW; only a manager confirms DONE, because DONE
 * writes to the contribution ledger. The server enforces the same rules.
 */
function transitionsFor(
  status: string,
  isManager: boolean,
): { to: string; label: string; primary?: boolean }[] {
  switch (status) {
    case "OPEN":
      return [{ to: "IN_PROGRESS", label: "Start", primary: true }];
    case "IN_PROGRESS":
      return [{ to: "IN_REVIEW", label: "Submit for review", primary: true }];
    case "IN_REVIEW":
      return isManager
        ? [
            { to: "DONE", label: "Confirm done", primary: true },
            { to: "IN_PROGRESS", label: "Send back" },
          ]
        : [{ to: "IN_PROGRESS", label: "Withdraw" }];
    case "DONE":
      return isManager ? [{ to: "IN_PROGRESS", label: "Reopen" }] : [];
    default:
      return [];
  }
}

export async function TasksTab({
  projectId,
  access,
  members,
  userId,
}: {
  projectId: string;
  access: ProjectAccess;
  members: Member[];
  userId: string | null;
}) {
  // Defense in depth — the page hides this tab for outsiders, and the board
  // itself refuses to render for them too.
  if (!access.canSeeInternal) {
    return (
      <EmptyState
        title="The task board is for project members."
        hint="Apply to contribute and you'll see how the work is organised."
      />
    );
  }

  const tasks = await db.task.findMany({
    where: { projectId },
    include: { assignee: { select: { id: true, name: true, avatarColor: true, avatarUrl: true, avatarPath: true } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const columns = TASK_STATUSES.map((status) => ({
    status,
    label: TASK_STATUS_COLORS[status][2],
    tasks: tasks.filter((t) => t.status === status),
  }));

  const goodFirst = tasks.filter((t) => t.goodFirstTask && t.status === "OPEN" && !t.assigneeId);
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      {access.canManage ? (
        <Details label="+ Create task">
          <form action={createTaskAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="projectId" value={projectId} />
            <Field label="Task">
              <input name="title" required placeholder="Summarize the 4 drought-index papers" />
            </Field>
            <Field label="Description" hint="optional — what does 'done' look like?">
              <textarea name="description" rows={2} />
            </Field>
            <div className="grid gap-3.5 sm:grid-cols-4">
              <Field label="Pod">
                <input name="pod" placeholder="Literature pod" />
              </Field>
              <Field label="Assignee">
                <select name="assigneeId" defaultValue="">
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Due">
                <input name="dueDate" type="date" />
              </Field>
              <Field label="Effort">
                <select name="effort" defaultValue="M">
                  <option value="S">Small</option>
                  <option value="M">Medium</option>
                  <option value="L">Large</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="CRediT role earned" hint="written to the contributor's record on completion">
                <select name="creditRole" defaultValue="">
                  <option value="">— none —</option>
                  {CREDIT_ROLES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <label className="mb-2.5 flex cursor-pointer items-center gap-2 text-[13px] font-normal">
                <input type="checkbox" name="goodFirstTask" className="!w-auto" />
                Good first task
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                style={{ color: "#faf8f3" }}
              >
                Create task
              </button>
            </div>
          </form>
        </Details>
      ) : access.isMember ? (
        <Details label="+ Add a task">
          <form action={createTaskAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="projectId" value={projectId} />
            <Field label="Task">
              <input name="title" required placeholder="What needs doing?" />
            </Field>
            <Field label="Description" hint="optional — what does 'done' look like?">
              <textarea name="description" rows={2} />
            </Field>
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Effort" className="w-32">
                <select name="effort" defaultValue="M">
                  <option value="S">Small</option>
                  <option value="M">Medium</option>
                  <option value="L">Large</option>
                </select>
              </Field>
              <label className="mb-2.5 flex cursor-pointer items-center gap-2 text-[13px] font-normal">
                <input type="checkbox" name="assignSelf" className="!w-auto" defaultChecked />
                Assign it to me
              </label>
              <div className="flex-1" />
              <button
                type="submit"
                className="mb-0.5 cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                style={{ color: "#faf8f3" }}
              >
                Add task
              </button>
            </div>
            <p className="-mt-1 text-[12px] text-muted">
              Leads assign credit roles and flag good first tasks when they triage.
            </p>
          </form>
        </Details>
      ) : null}

      {goodFirst.length > 0 ? (
        <div className="border-l-2 border-olive bg-olive-tint/40 px-5 py-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-olive-dark">
            Good first tasks
          </div>
          <p className="text-[13px] leading-relaxed text-ink-3">
            New to the project? These are scoped small on purpose — {goodFirst.length} waiting:{" "}
            {goodFirst.map((t) => t.title).slice(0, 3).join(" · ")}
          </p>
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet."
          hint="A task board is how a project turns new members into contributors."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const [bg, fg] = TASK_STATUS_COLORS[col.status];
            return (
              <div
                key={col.status}
                className="flex flex-col gap-2.5 border-t-2 bg-sand/50 p-3"
                style={{ borderTopColor: fg }}
              >
                <div className="flex items-center justify-between">
                  <Pill bg={bg} fg={fg}>
                    {col.label}
                  </Pill>
                  <span
                    className="px-1.5 text-[12px] font-semibold"
                    style={{ color: fg }}
                  >
                    {col.tasks.length}
                  </span>
                </div>

                {col.tasks.length === 0 ? (
                  <div className="py-3 text-center text-[12px] text-muted">—</div>
                ) : null}

                {col.tasks.map((t) => {
                  const mine = t.assigneeId === userId;
                  const involved = mine || t.createdById === userId;
                  const canMove = access.canManage || involved;
                  const canDelete =
                    access.canManage || (t.createdById === userId && t.status !== "DONE");
                  const overdue =
                    t.dueDate && t.status !== "DONE" && new Date(t.dueDate) < now;
                  const moves = canMove ? transitionsFor(t.status, access.canManage) : [];

                  return (
                    <Card key={t.id} className={`flex flex-col gap-2 p-3.5 ${mine ? "border-l-2 border-brick" : ""}`}>
                      <div className="text-[13.5px] font-semibold leading-[1.35]">{t.title}</div>
                      {t.description ? (
                        <div className="text-[12.5px] leading-[1.45] text-ink-4">{t.description}</div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span
                          className="bg-tint px-1.5 py-0.5 font-semibold text-ink-4"
                          title={`${EFFORT_LABEL[t.effort] ?? t.effort} task`}
                        >
                          {EFFORT_LABEL[t.effort] ?? t.effort}
                        </span>
                        {t.pod ? <span className="bg-tint px-1.5 py-0.5 text-ink-4">{t.pod}</span> : null}
                        {t.goodFirstTask ? (
                          <span className="bg-olive-tint px-1.5 py-0.5 text-olive-dark">
                            good first task
                          </span>
                        ) : null}
                        {t.creditRole ? (
                          <span className="bg-plum-tint px-1.5 py-0.5 text-plum" title="CRediT role earned on completion">
                            {t.creditRole}
                          </span>
                        ) : null}
                        {t.dueDate ? (
                          <span className={overdue ? "font-semibold text-brick" : "text-muted"}>
                            {overdue ? "overdue · " : "due "}
                            {shortDate(t.dueDate)}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 border-t border-line-soft pt-2">
                        {t.assignee ? (
                          <>
                            <Avatar name={t.assignee.name} color={t.assignee.avatarColor} src={avatarSrc(t.assignee)} size={22} />
                            <span className="text-[11.5px] text-ink-4">
                              {mine ? "You" : t.assignee.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11.5px] text-muted">Unassigned</span>
                        )}
                        <div className="flex-1" />
                        {access.isMember && !t.assignee && t.status === "OPEN" ? (
                          <form action={claimTaskAction}>
                            <input type="hidden" name="taskId" value={t.id} />
                            <button
                              type="submit"
                              className="cursor-pointer border-none bg-transparent p-0 text-[11.5px] font-semibold text-brick"
                            >
                              Claim
                            </button>
                          </form>
                        ) : null}
                        {mine && t.status !== "DONE" ? (
                          <form action={claimTaskAction}>
                            <input type="hidden" name="taskId" value={t.id} />
                            <button
                              type="submit"
                              className="cursor-pointer border-none bg-transparent p-0 text-[11.5px] text-muted hover:text-brick"
                              title="Release this task back to the board"
                            >
                              Release
                            </button>
                          </form>
                        ) : null}
                      </div>

                      {moves.length || canDelete ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {moves.length ? (
                            <form action={updateTaskStatusAction} className="flex flex-wrap gap-1.5">
                              <input type="hidden" name="taskId" value={t.id} />
                              {moves.map((m) =>
                                m.primary ? (
                                  <button
                                    key={m.to}
                                    type="submit"
                                    name="status"
                                    value={m.to}
                                    className="cursor-pointer border-none bg-brick px-2.5 py-1 text-[11.5px] font-semibold"
                                    style={{ color: "#faf8f3" }}
                                  >
                                    {m.label}
                                  </button>
                                ) : (
                                  <button
                                    key={m.to}
                                    type="submit"
                                    name="status"
                                    value={m.to}
                                    className="cursor-pointer border border-line-input bg-card px-2.5 py-1 text-[11.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                                  >
                                    {m.label}
                                  </button>
                                ),
                              )}
                            </form>
                          ) : null}
                          {canDelete ? (
                            <>
                              <div className="flex-1" />
                              <form action={deleteTaskAction}>
                                <input type="hidden" name="taskId" value={t.id} />
                                <button
                                  type="submit"
                                  className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-muted hover:text-brick"
                                >
                                  Delete
                                </button>
                              </form>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
