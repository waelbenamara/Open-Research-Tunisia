import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc, dateTime, monthYear, relativeTime } from "@/lib/format";
import { ROLE_COLORS, statusPill } from "@/lib/theme";
import { Avatar, Breadcrumb, Card, EmptyState, Pill, SectionLabel, Shell } from "@/components/ui";

export const metadata = { title: "Member activity" };

/**
 * The admin's view of one account: who they are, when they signed in, and
 * everything they've done — sign-ins and privileged actions from the audit
 * log, plus their contributions, applications, and enrolments.
 */
export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login?next=/admin");
  if (viewer.role !== "ADMIN") redirect("/");

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      sessions: { orderBy: { createdAt: "desc" }, take: 15 },
      contributions: {
        include: { project: { select: { slug: true, title: true } } },
        orderBy: { occurredAt: "desc" },
        take: 15,
      },
      applications: {
        include: { project: { select: { slug: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      enrollments: {
        include: { workshop: { select: { slug: true, title: true } } },
        orderBy: { enrolledAt: "desc" },
        take: 10,
      },
      memberships: {
        include: { project: { select: { slug: true, title: true } } },
        orderBy: { joinedAt: "desc" },
      },
      oauthAccounts: { select: { provider: true, createdAt: true } },
    },
  });
  if (!user) notFound();

  // Their trail in the audit log: sign-ins, submissions, privileged actions.
  const actions = await db.auditLog.findMany({
    where: { actorId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const [rbg, rfg] = ROLE_COLORS[user.role] ?? ROLE_COLORS.MEMBER;
  const lastSession = user.sessions[0];

  return (
    <Shell className="pb-24 pt-7">
      <Breadcrumb href="/admin?tab=members" label="Admin · Members" current={user.name} />

      <div className="mb-8 flex flex-wrap items-center gap-5 border-b border-line pb-7">
        <Avatar name={user.name} color={user.avatarColor} src={avatarSrc(user)} size={56} />
        <div className="min-w-[260px] flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-[26px] font-medium">{user.name}</h1>
            <Pill bg={rbg} fg={rfg}>
              {user.suspended ? "Suspended" : user.role}
            </Pill>
            {user.canPostProjects ? (
              <Pill bg="#e4ecdb" fg="#3e5730">
                Can post
              </Pill>
            ) : null}
          </div>
          <div className="mt-1 text-[13px] text-ink-4">
            {user.email} · joined {monthYear(user.createdAt)} ·{" "}
            {user.passwordHash ? "password" : "no password"}
            {user.oauthAccounts.length
              ? ` · ${user.oauthAccounts.map((a) => a.provider).join(" + ")} linked`
              : ""}
            {" · "}
            {lastSession
              ? `last sign-in ${relativeTime(lastSession.createdAt)}`
              : "never signed in"}
          </div>
          <div className="mt-1.5 text-[12.5px]">
            <Link href={`/people/${user.id}`}>Public profile →</Link>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <section>
            <SectionLabel>Sign-ins — active sessions, newest first</SectionLabel>
            {user.sessions.length === 0 ? (
              <EmptyState title="No active sessions." hint="Sign-ins also appear in the action trail below once logged." />
            ) : (
              <div className="flex flex-col">
                {user.sessions.map((s) => (
                  <div key={s.id} className="flex items-baseline gap-4 border-b border-line-soft py-2">
                    <span className="min-w-[105px] text-[12px] text-muted">
                      {relativeTime(s.createdAt)}
                    </span>
                    <span className="text-[13px] text-ink-3">{dateTime(s.createdAt)}</span>
                    <span className="flex-1" />
                    <span className="text-[12px] text-muted">
                      {s.expiresAt < new Date() ? "expired" : `expires ${relativeTime(s.expiresAt)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>Action trail — from the audit log</SectionLabel>
            {actions.length === 0 ? (
              <EmptyState title="No recorded actions yet." />
            ) : (
              <div className="flex flex-col">
                {actions.map((l) => (
                  <div key={l.id} className="flex items-baseline gap-4 border-b border-line-soft py-2">
                    <span className="min-w-[105px] text-[12px] text-muted">
                      {relativeTime(l.createdAt)}
                    </span>
                    <span className="flex-1 text-[13px] text-ink-3">
                      <span className="font-mono text-[12px] text-brick">{l.action}</span>
                      {l.targetType ? <span className="text-muted"> · {l.targetType}</span> : null}
                      {l.meta ? <span className="text-ink-4"> · {l.meta}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-8">
          <section>
            <SectionLabel>Projects</SectionLabel>
            {user.memberships.length === 0 ? (
              <EmptyState title="On no projects." />
            ) : (
              <div className="flex flex-col gap-2">
                {user.memberships.map((m) => (
                  <Card key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Link href={`/projects/${m.project.slug}`} className="flex-1 text-[13.5px] font-semibold no-underline">
                      {m.project.title}
                    </Link>
                    <span className="text-[12px] text-muted">
                      {m.projectRole.toLowerCase()} · since {monthYear(m.joinedAt)}
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>Recent contributions</SectionLabel>
            {user.contributions.length === 0 ? (
              <EmptyState title="Nothing logged." />
            ) : (
              <div className="flex flex-col">
                {user.contributions.map((c) => (
                  <div key={c.id} className="flex items-baseline gap-3 border-b border-line-soft py-2">
                    <span className="min-w-[105px] text-[12px] text-muted">
                      {relativeTime(c.occurredAt)}
                    </span>
                    <span className="flex-1 text-[13px] text-ink-3">
                      {c.text}
                      {c.project ? <span className="text-muted"> — {c.project.title}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>Applications</SectionLabel>
            {user.applications.length === 0 ? (
              <EmptyState title="No applications." />
            ) : (
              <div className="flex flex-col gap-2">
                {user.applications.map((a) => {
                  const sp = statusPill(a.status);
                  return (
                    <Card key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Link href={`/projects/${a.project.slug}`} className="flex-1 text-[13.5px] no-underline">
                        {a.project.title}
                      </Link>
                      <Pill bg={sp.bg} fg={sp.fg}>
                        {a.status}
                      </Pill>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>Workshops</SectionLabel>
            {user.enrollments.length === 0 ? (
              <EmptyState title="No enrolments." />
            ) : (
              <div className="flex flex-col gap-2">
                {user.enrollments.map((e) => (
                  <Card key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Link href={`/workshops/${e.workshop.slug}`} className="flex-1 text-[13.5px] no-underline">
                      {e.workshop.title}
                    </Link>
                    <span className="text-[12px] text-muted">{e.status.toLowerCase()}</span>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}
