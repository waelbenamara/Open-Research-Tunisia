import { db } from "@/lib/db";
import { avatarSrc, fullDate, relativeTime } from "@/lib/format";
import { addAssignmentAction, gradeSubmissionAction, submitAssignmentAction } from "@/actions/workshops";
import { Avatar, Card, EmptyState, Field, Pill, SectionLabel } from "@/components/ui";
import { Details } from "@/components/Collapse";

type SessionRef = { id: string; index: number; title: string };

export async function AssignmentsTab({
  workshopId,
  sessions,
  canManage,
  isEnrolled,
  userId,
}: {
  workshopId: string;
  sessions: SessionRef[];
  canManage: boolean;
  isEnrolled: boolean;
  userId: string | null;
}) {
  const assignments = await db.assignment.findMany({
    where: { workshopId },
    include: {
      session: { select: { index: true, title: true } },
      submissions: {
        include: { user: { select: { id: true, name: true, avatarColor: true, avatarUrl: true, avatarPath: true } } },
        orderBy: { submittedAt: "desc" },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <Details label="+ Create assignment">
          <form action={addAssignmentAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="workshopId" value={workshopId} />
            <Field label="Title">
              <input name="title" required placeholder="Clean the rainfall sample and plot monthly means" />
            </Field>
            <Field label="Instructions">
              <textarea name="description" rows={3} placeholder="What should learners hand in?" />
            </Field>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Session" hint="optional">
                <select name="sessionId" defaultValue="">
                  <option value="">— workshop-wide —</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.index}. {s.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Due date">
                <input name="dueDate" type="date" />
              </Field>
              <Field label="Max points">
                <input name="maxPoints" type="number" defaultValue={100} min={1} />
              </Field>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                style={{ color: "#faf8f3" }}
              >
                Create assignment
              </button>
            </div>
          </form>
        </Details>
      ) : null}

      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet."
          hint="Practice is what separates a workshop from a webinar."
        />
      ) : (
        assignments.map((a) => {
          const mine = userId ? a.submissions.find((s) => s.userId === userId) : null;
          const overdue = a.dueDate && a.dueDate < new Date() && !mine;
          return (
            <Card key={a.id} className="flex flex-col gap-3 px-[22px] py-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <div className="font-serif text-[19px] font-medium">{a.title}</div>
                <div className="flex-1" />
                {a.session ? (
                  <span className="text-[12px] text-muted">
                    Session {a.session.index} · {a.session.title}
                  </span>
                ) : null}
                {a.dueDate ? (
                  <Pill bg={overdue ? "#f0ddd6" : "#f2eee3"} fg={overdue ? "#8a3325" : "#57503f"}>
                    Due {fullDate(a.dueDate)}
                  </Pill>
                ) : null}
              </div>

              {a.description ? (
                <div className="whitespace-pre-line text-[14px] leading-[1.6] text-ink-3">
                  {a.description}
                </div>
              ) : null}

              {/* Learner view */}
              {isEnrolled && !canManage ? (
                <div className="border-t border-line-soft pt-3.5">
                  {mine?.grade != null ? (
                    <div className="mb-3 bg-olive-tint px-4 py-3">
                      <div className="text-[13px] font-semibold text-olive-dark">
                        Graded: {mine.grade} / {a.maxPoints}
                      </div>
                      {mine.feedback ? (
                        <div className="mt-1 text-[13px] leading-relaxed text-ink-2">
                          {mine.feedback}
                        </div>
                      ) : null}
                    </div>
                  ) : mine ? (
                    <div className="mb-3 text-[12.5px] text-muted">
                      Submitted {relativeTime(mine.submittedAt)} — awaiting feedback.
                    </div>
                  ) : null}

                  <form action={submitAssignmentAction} className="flex flex-col gap-3">
                    <input type="hidden" name="assignmentId" value={a.id} />
                    <Field label={mine ? "Resubmit your work" : "Your submission"}>
                      <textarea
                        name="body"
                        rows={3}
                        defaultValue={mine?.body ?? ""}
                        placeholder="Paste your answer, or describe what you did…"
                      />
                    </Field>
                    <div className="flex items-end gap-2.5">
                      <Field label="Link" hint="notebook, repo, doc" className="flex-1">
                        <input name="url" defaultValue={mine?.url ?? ""} placeholder="https://…" />
                      </Field>
                      <button
                        type="submit"
                        className="mb-0 cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                        style={{ color: "#faf8f3" }}
                      >
                        {mine ? "Resubmit" : "Submit"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {/* Facilitator view */}
              {canManage ? (
                <div className="border-t border-line-soft pt-3.5">
                  <SectionLabel>Submissions ({a.submissions.length})</SectionLabel>
                  {a.submissions.length === 0 ? (
                    <div className="text-[13px] text-muted">Nothing handed in yet.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {a.submissions.map((s) => (
                        <div key={s.id} className="border border-line-soft bg-paper px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.user.name} color={s.user.avatarColor} src={avatarSrc(s.user)} size={26} />
                            <span className="text-[13.5px] font-semibold">{s.user.name}</span>
                            <span className="text-[12px] text-muted">
                              {relativeTime(s.submittedAt)}
                            </span>
                            <div className="flex-1" />
                            {s.grade != null ? (
                              <Pill bg="#e4ecdb" fg="#3e5730">
                                {s.grade} / {a.maxPoints}
                              </Pill>
                            ) : (
                              <Pill bg="#f4ead2" fg="#7a5b16">
                                Needs grading
                              </Pill>
                            )}
                          </div>
                          {s.body ? (
                            <div className="mt-2 whitespace-pre-line text-[13.5px] leading-[1.55] text-ink-2">
                              {s.body}
                            </div>
                          ) : null}
                          {s.url ? (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1.5 inline-block text-[13px]"
                            >
                              Open submission
                            </a>
                          ) : null}

                          <form
                            action={gradeSubmissionAction}
                            className="mt-3 flex flex-wrap items-end gap-2.5 border-t border-line-soft pt-2.5"
                          >
                            <input type="hidden" name="submissionId" value={s.id} />
                            <div className="w-[90px]">
                              <label className="!text-[12px]">Grade</label>
                              <input
                                name="grade"
                                type="number"
                                min={0}
                                max={a.maxPoints}
                                defaultValue={s.grade ?? undefined}
                                className="!py-1.5 !text-[13px]"
                              />
                            </div>
                            <div className="min-w-[200px] flex-1">
                              <label className="!text-[12px]">Feedback</label>
                              <input
                                name="feedback"
                                defaultValue={s.feedback ?? ""}
                                placeholder="What was strong, what to improve…"
                                className="!py-1.5 !text-[13px]"
                              />
                            </div>
                            <button
                              type="submit"
                              className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                            >
                              Save grade
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {!isEnrolled && !canManage ? (
                <div className="border-t border-line-soft pt-3 text-[13px] text-muted">
                  Enrol to submit this assignment.
                </div>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}
