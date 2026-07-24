import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fullDate, shortDate } from "@/lib/format";
import { stagePill, statusPill, TASK_STATUS_COLORS } from "@/lib/theme";
import { updateTaskStatusAction } from "@/actions/projects";
import { Card, EmptyState, LinkButton, Pill, SectionLabel, Shell } from "@/components/ui";

export const metadata = { title: "My work" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const [myTasks, memberships, applications, enrollments, dueAssignments, bookmarks, leadInbox] =
    await Promise.all([
      db.task.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" } },
        include: { project: { select: { slug: true, title: true } } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      }),
      db.projectMember.findMany({
        where: { userId: user.id },
        include: {
          project: {
            select: {
              slug: true,
              title: true,
              stage: true,
              _count: { select: { tasks: true, messages: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      }),
      db.application.findMany({
        where: { userId: user.id, status: { in: ["PENDING", "UNDER_REVIEW"] } },
        include: { project: { select: { slug: true, title: true } } },
      }),
      db.enrollment.findMany({
        where: { userId: user.id, status: { in: ["ENROLLED", "WAITLIST"] } },
        include: {
          workshop: {
            select: {
              slug: true,
              title: true,
              startDate: true,
              sessions: { orderBy: { scheduledAt: "asc" }, select: { title: true, scheduledAt: true } },
            },
          },
        },
      }),
      db.assignment.findMany({
        where: {
          workshop: { enrollments: { some: { userId: user.id, status: "ENROLLED" } } },
          submissions: { none: { userId: user.id } },
        },
        include: { workshop: { select: { slug: true, title: true } } },
        orderBy: { dueDate: "asc" },
      }),
      db.bookmark.findMany({
        where: { userId: user.id },
        include: {
          project: { select: { slug: true, title: true } },
          workshop: { select: { slug: true, title: true } },
        },
      }),
      db.application.findMany({
        where: {
          status: { in: ["PENDING", "UNDER_REVIEW"] },
          project: { leadId: user.id },
        },
        include: { project: { select: { slug: true, title: true } }, user: { select: { name: true } } },
      }),
    ]);

  const nextSessions = enrollments
    .flatMap((e) =>
      e.workshop.sessions
        .filter((s) => s.scheduledAt > new Date())
        .map((s) => ({ ...s, workshop: e.workshop })),
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, 4);

  return (
    <Shell className="pb-24 pt-11">
      <h1 className="font-serif text-[32px] font-medium">My work</h1>
      <p className="mb-9 mt-1 text-[14px] text-ink-4">
        Everything waiting on you, in one place.
      </p>

      {leadInbox.length > 0 ? (
        <div className="mb-8 border-l-2 border-brick bg-brick-tint/50 px-5 py-4">
          <div className="text-[13px] font-semibold text-brick">
            {leadInbox.length} application{leadInbox.length === 1 ? "" : "s"} waiting on your
            decision
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {leadInbox.map((a) => (
              <Link key={a.id} href={`/projects/${a.project.slug}?tab=applications`}>
                {a.user.name} → {a.project.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid items-start gap-11 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-9">
          <section>
            <SectionLabel>My tasks ({myTasks.length})</SectionLabel>
            {myTasks.length === 0 ? (
              <EmptyState
                title="No tasks assigned to you."
                hint="Open a project you're on and claim a task from its board."
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                {myTasks.map((t) => {
                  const [bg, fg, label] = TASK_STATUS_COLORS[t.status];
                  const overdue = t.dueDate && t.dueDate < new Date();
                  return (
                    <Card key={t.id} className="flex flex-wrap items-center gap-3.5 px-5 py-4">
                      <div className="min-w-[200px] flex-1">
                        <div className="text-[14px] font-semibold">{t.title}</div>
                        <div className="mt-0.5 text-[12.5px] text-muted">
                          <Link href={`/projects/${t.project.slug}?tab=tasks`} className="no-underline">
                            {t.project.title}
                          </Link>
                          {t.dueDate ? (
                            <span style={{ color: overdue ? "#8a3325" : undefined }}>
                              {" "}
                              · due {shortDate(t.dueDate)}
                              {overdue ? " (overdue)" : ""}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Pill bg={bg} fg={fg}>
                        {label}
                      </Pill>
                      <form action={updateTaskStatusAction} className="flex gap-1.5">
                        <input type="hidden" name="taskId" value={t.id} />
                        <input type="hidden" name="status" value="DONE" />
                        <button
                          type="submit"
                          className="cursor-pointer border border-line-input bg-card px-3 py-1.5 text-[12px] font-semibold text-ink-4 hover:border-olive hover:text-olive"
                        >
                          Mark done
                        </button>
                      </form>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>Assignments due ({dueAssignments.length})</SectionLabel>
            {dueAssignments.length === 0 ? (
              <EmptyState title="Nothing outstanding." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {dueAssignments.map((a) => (
                  <Card key={a.id} className="flex flex-wrap items-center gap-3.5 px-5 py-4">
                    <div className="min-w-[200px] flex-1">
                      <div className="text-[14px] font-semibold">{a.title}</div>
                      <div className="mt-0.5 text-[12.5px] text-muted">{a.workshop.title}</div>
                    </div>
                    {a.dueDate ? (
                      <span className="text-[12.5px] text-muted">Due {fullDate(a.dueDate)}</span>
                    ) : null}
                    <LinkButton
                      href={`/workshops/${a.workshop.slug}?tab=assignments`}
                      variant="ghost"
                      size="sm"
                    >
                      Submit
                    </LinkButton>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>My projects</SectionLabel>
            {memberships.length === 0 ? (
              <EmptyState
                title="Not on a project yet."
                hint={<Link href="/?filter=recruiting">See what&apos;s recruiting</Link>}
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                {memberships.map((m) => {
                  const pill = stagePill(m.project.stage);
                  return (
                    <Card key={m.id} className="flex flex-wrap items-center gap-3.5 px-5 py-4">
                      <div className="min-w-[200px] flex-1">
                        <Link
                          href={`/projects/${m.project.slug}`}
                          className="text-[14.5px] font-semibold no-underline"
                        >
                          {m.project.title}
                        </Link>
                        <div className="mt-0.5 text-[12.5px] text-muted">
                          {m.roleTitle ?? m.projectRole} · {m.project._count.tasks} tasks ·{" "}
                          {m.project._count.messages} messages
                        </div>
                      </div>
                      <Pill bg={pill.bg} fg={pill.fg}>
                        {m.project.stage}
                      </Pill>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-9">
          <section>
            <SectionLabel>Upcoming sessions</SectionLabel>
            {nextSessions.length === 0 ? (
              <EmptyState title="No sessions scheduled." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {nextSessions.map((s, i) => (
                  <Card key={i} className="px-5 py-3.5">
                    <div className="text-[13.5px] font-semibold">{s.title}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      <Link href={`/workshops/${s.workshop.slug}`} className="no-underline">
                        {s.workshop.title}
                      </Link>{" "}
                      · {fullDate(s.scheduledAt)}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>Pending applications</SectionLabel>
            {applications.length === 0 ? (
              <EmptyState title="None pending." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {applications.map((a) => {
                  const p = statusPill(a.status);
                  return (
                    <Card key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                      <Link
                        href={`/projects/${a.project.slug}`}
                        className="flex-1 text-[13.5px] font-semibold no-underline"
                      >
                        {a.project.title}
                      </Link>
                      <Pill bg={p.bg} fg={p.fg}>
                        {p.label}
                      </Pill>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {bookmarks.length ? (
            <section>
              <SectionLabel>Saved</SectionLabel>
              <div className="flex flex-col gap-2">
                {bookmarks.map((b) => {
                  const target = b.project
                    ? { href: `/projects/${b.project.slug}`, title: b.project.title }
                    : b.workshop
                      ? { href: `/workshops/${b.workshop.slug}`, title: b.workshop.title }
                      : null;
                  if (!target) return null;
                  return (
                    <Link
                      key={b.id}
                      href={target.href}
                      className="text-[13.5px] font-semibold no-underline"
                    >
                      {target.title}
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
