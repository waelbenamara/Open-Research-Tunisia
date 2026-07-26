import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc, fullDate, monthYear, relativeTime } from "@/lib/format";
import { ROLE_COLORS, stagePill, statusPill } from "@/lib/theme";
import { decideApplicationAction } from "@/actions/projects";
import {
  archiveProjectAction,
  decidePostingRequestAction,
  decideProjectApprovalAction,
  postGlobalAnnouncementAction,
  setUserRoleAction,
  toggleSuspendAction,
} from "@/actions/admin";
import { Avatar, Card, EmptyState, Field, Pill, SectionLabel, Shell, StatCard } from "@/components/ui";
import { Details } from "@/components/Collapse";

export const metadata = { title: "Admin console" };

const TABS: [string, string][] = [
  ["apps", "Applications"],
  ["posters", "Posting requests"],
  ["projects", "Projects"],
  ["workshops", "Workshops"],
  ["members", "Members"],
  ["audit", "Audit log"],
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");

  const { tab = "apps" } = await searchParams;

  const [pendingApps, pendingPosters, pendingProjects, projectCount, memberCount, workshopCount] =
    await Promise.all([
      db.application.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
      db.postingRequest.count({ where: { status: "PENDING" } }),
      db.project.count({ where: { approvalStatus: "PENDING", archived: false } }),
      db.project.count({ where: { archived: false, approvalStatus: "APPROVED" } }),
      db.user.count(),
      db.workshop.count({ where: { status: { in: ["OPEN", "RUNNING"] } } }),
    ]);

  return (
    <Shell className="pb-24 pt-11">
      <h1 className="font-serif text-[32px] font-medium">Admin console</h1>
      <p className="mb-7 mt-1 text-[14px] text-ink-4">
        Review applications, grant posting rights, and oversee the initiative.
      </p>

      <div className="mb-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard n={pendingApps} label="Applications awaiting review" />
        <StatCard n={pendingPosters} label="Posting-rights requests" />
        <StatCard n={pendingProjects} label="Projects awaiting approval" />
        <StatCard n={projectCount} label="Live projects" />
        <StatCard n={workshopCount} label="Open workshops" />
        <StatCard n={memberCount} label="Community members" />
      </div>

      <div className="mb-7 flex gap-6 overflow-x-auto border-b border-line">
        {TABS.map(([key, label]) => {
          const active = tab === key;
          const badge =
            key === "apps"
              ? pendingApps
              : key === "posters"
                ? pendingPosters
                : key === "projects"
                  ? pendingProjects
                  : 0;
          return (
            <Link
              key={key}
              href={`/admin?tab=${key}`}
              className="whitespace-nowrap px-0.5 pb-3 text-[14px] no-underline hover:no-underline"
              style={{
                fontWeight: active ? 600 : 400,
                color: active ? "#211d16" : "#6e675a",
                borderBottom: `2px solid ${active ? "#8a3325" : "transparent"}`,
                marginBottom: -1,
              }}
            >
              {label}
              {badge ? ` (${badge})` : ""}
            </Link>
          );
        })}
      </div>

      {tab === "apps" ? <AdminApplications /> : null}
      {tab === "posters" ? <AdminPosters /> : null}
      {tab === "projects" ? <AdminProjects /> : null}
      {tab === "workshops" ? <AdminWorkshops /> : null}
      {tab === "members" ? <AdminMembers currentUserId={user.id} /> : null}
      {tab === "audit" ? <AdminAudit /> : null}
    </Shell>
  );
}

/* ── Applications ───────────────────────────────────────── */

async function AdminApplications() {
  const apps = await db.application.findMany({
    include: {
      user: { select: { id: true, name: true, avatarColor: true, avatarUrl: true, avatarPath: true, affiliation: true } },
      project: { select: { slug: true, title: true, lead: { select: { name: true } } } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  if (apps.length === 0) return <EmptyState title="No applications across the platform yet." />;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="mb-1 text-[13px] text-ink-4">
        Project leads decide their own applications — admins can step in when a lead is unresponsive.
      </p>
      {apps.map((a) => {
        const decided = !["PENDING", "UNDER_REVIEW"].includes(a.status);
        const p = statusPill(a.status);
        return (
          <Card key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <Avatar name={a.user.name} color={a.user.avatarColor} src={avatarSrc(a.user)} size={36} />
            <div className="min-w-[240px] flex-1">
              <div className="text-[14.5px] font-semibold">
                {a.user.name}{" "}
                <span className="font-normal text-muted">
                  →{" "}
                  <Link href={`/projects/${a.project.slug}`} className="no-underline">
                    {a.project.title}
                  </Link>
                </span>
              </div>
              <div className="mt-1 text-[13px] leading-[1.5] text-ink-4">
                {a.roleApplied} · {a.motivation.slice(0, 140)}
                {a.motivation.length > 140 ? "…" : ""}
              </div>
              <div className="mt-1 text-[12px] text-muted">
                Lead: {a.project.lead.name} · applied {fullDate(a.createdAt)}
              </div>
            </div>
            {decided ? (
              <Pill bg={p.bg} fg={p.fg}>
                {p.label}
              </Pill>
            ) : (
              <form action={decideApplicationAction} className="flex gap-2">
                <input type="hidden" name="applicationId" value={a.id} />
                <button
                  type="submit"
                  name="decision"
                  value="ACCEPTED"
                  className="cursor-pointer border-none bg-olive px-4 py-2 text-[12.5px] font-semibold hover:bg-olive-dark"
                  style={{ color: "#faf8f3" }}
                >
                  Accept
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="DECLINED"
                  className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                >
                  Decline
                </button>
              </form>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ── Posting requests ───────────────────────────────────── */

async function AdminPosters() {
  const requests = await db.postingRequest.findMany({
    include: {
      user: { select: { id: true, name: true, avatarColor: true, avatarUrl: true, avatarPath: true, affiliation: true, headline: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  if (requests.length === 0)
    return <EmptyState title="No posting-rights requests." hint="Members request these from their profile." />;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="mb-1 text-[13px] text-ink-4">
        Members requesting the right to post projects and workshops. Approved members become project
        leads.
      </p>
      {requests.map((r) => {
        const p = statusPill(r.status);
        return (
          <Card key={r.id} className="flex flex-col gap-3 px-5 py-4">
            <div className="flex items-start gap-4">
              <Avatar name={r.user.name} color={r.user.avatarColor} src={avatarSrc(r.user)} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold">
                  <Link href={`/people/${r.user.id}`} className="text-ink no-underline hover:text-brick">
                    {r.user.name}
                  </Link>
                  <span className="font-normal text-muted">
                    {r.user.affiliation ? ` · ${r.user.affiliation}` : ""}
                  </span>
                </div>
                <div className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-2">
                  Wants to post: “{r.proposal}”
                </div>
                <div className="mt-1 text-[13px] leading-[1.5] text-ink-4">{r.motivation}</div>
                <div className="mt-1 text-[12px] text-muted">Requested {fullDate(r.createdAt)}</div>
              </div>
              {r.status !== "PENDING" ? (
                <Pill bg={p.bg} fg={p.fg}>
                  {p.label}
                </Pill>
              ) : null}
            </div>

            {r.status === "PENDING" ? (
              <form
                action={decidePostingRequestAction}
                className="flex flex-wrap items-end gap-2.5 border-t border-line-soft pt-3"
              >
                <input type="hidden" name="requestId" value={r.id} />
                <div className="min-w-[220px] flex-1">
                  <label className="!text-[12px]">Note (optional)</label>
                  <input name="note" className="!py-2 !text-[13px]" />
                </div>
                <button
                  type="submit"
                  name="decision"
                  value="APPROVED"
                  className="cursor-pointer border-none bg-olive px-4 py-2 text-[12.5px] font-semibold hover:bg-olive-dark"
                  style={{ color: "#faf8f3" }}
                >
                  Approve
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="DENIED"
                  className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                >
                  Deny
                </button>
              </form>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

/* ── Projects ───────────────────────────────────────────── */

async function AdminProjects() {
  const projects = await db.project.findMany({
    include: {
      lead: { select: { name: true } },
      _count: { select: { members: true, applications: true, outputs: true } },
      applications: { where: { status: "PENDING" }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const awaiting = projects.filter((p) => p.approvalStatus === "PENDING" && !p.archived);
  const rest = projects.filter((p) => !(p.approvalStatus === "PENDING" && !p.archived));

  return (
    <div className="flex flex-col gap-2.5">
      {awaiting.length > 0 ? (
        <div className="mb-4 flex flex-col gap-2.5">
          <SectionLabel>Awaiting approval — not yet public</SectionLabel>
          {awaiting.map((p) => (
            <Card key={p.id} className="border-l-2 border-gold px-5 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-[240px] flex-1">
                  <Link href={`/projects/${p.slug}`} className="text-[14.5px] font-semibold no-underline">
                    {p.title}
                  </Link>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    Lead: {p.lead.name} · submitted {relativeTime(p.createdAt)}
                  </div>
                  <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-ink-3">
                    {p.summary}
                  </p>
                </div>
              </div>
              <form action={decideProjectApprovalAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="projectId" value={p.id} />
                <input
                  name="note"
                  placeholder="Optional note to the lead — required context if rejecting"
                  className="min-w-[260px] flex-1 !py-1.5 !text-[12.5px]"
                />
                <button
                  type="submit"
                  name="decision"
                  value="APPROVED"
                  className="cursor-pointer border-none bg-olive px-4 py-2 text-[12px] font-semibold"
                  style={{ color: "#faf8f3" }}
                >
                  Approve
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="REJECTED"
                  className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[12px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                >
                  Request changes
                </button>
              </form>
            </Card>
          ))}
        </div>
      ) : null}

      {rest.length === 0 && awaiting.length === 0 ? (
        <EmptyState title="No projects yet." />
      ) : (
        rest.map((p) => {
          const pill = stagePill(p.stage);
          return (
            <Card key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-[240px] flex-1">
                <Link href={`/projects/${p.slug}`} className="text-[14.5px] font-semibold no-underline">
                  {p.title}
                </Link>
                <div className="mt-0.5 text-[12.5px] text-muted">
                  Lead: {p.lead.name} · {p._count.members} members · {p.applications.length} pending
                  applications · {p._count.outputs} outputs
                </div>
              </div>
              {p.approvalStatus === "REJECTED" ? (
                <Pill bg="#f0ddd6" fg="#69241a">
                  Changes requested
                </Pill>
              ) : null}
              <Pill bg={pill.bg} fg={pill.fg}>
                {p.stage}
              </Pill>
              <form action={archiveProjectAction}>
                <input type="hidden" name="projectId" value={p.id} />
                <button
                  type="submit"
                  className="cursor-pointer border border-line-input bg-card px-3.5 py-1.5 text-[12px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                >
                  {p.archived ? "Restore" : "Archive"}
                </button>
              </form>
            </Card>
          );
        })
      )}
    </div>
  );
}

async function AdminWorkshops() {
  const workshops = await db.workshop.findMany({
    include: {
      facilitator: { select: { name: true } },
      _count: { select: { enrollments: true, sessions: true, certificates: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="flex flex-col gap-2.5">
      {workshops.length === 0 ? (
        <EmptyState title="No workshops yet." />
      ) : (
        workshops.map((w) => (
          <Card key={w.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <div className="min-w-[240px] flex-1">
              <Link href={`/workshops/${w.slug}`} className="text-[14.5px] font-semibold no-underline">
                {w.title}
              </Link>
              <div className="mt-0.5 text-[12.5px] text-muted">
                {w.facilitator.name} · {w._count.enrollments}/{w.seats} enrolled ·{" "}
                {w._count.sessions} sessions · {w._count.certificates} certificates
              </div>
            </div>
            <span className="text-[12.5px] text-muted">{fullDate(w.startDate)}</span>
            <Pill bg="#f2eee3" fg="#57503f">
              {w.status}
            </Pill>
          </Card>
        ))
      )}
    </div>
  );
}

/* ── Members ────────────────────────────────────────────── */

async function AdminMembers({ currentUserId }: { currentUserId: string }) {
  const users = await db.user.findMany({
    include: {
      _count: { select: { memberships: true, contributions: true } },
      // Most recent session = last sign-in still alive.
      sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="flex flex-col gap-5">
      <Details label="+ Post a platform-wide announcement">
        <form action={postGlobalAnnouncementAction} className="flex flex-col gap-3">
          <Field label="Message" hint="every member gets a notification">
            <textarea name="body" rows={3} required />
          </Field>
          <div className="flex justify-end">
            <button
              type="submit"
              className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
              style={{ color: "#faf8f3" }}
            >
              Send to everyone
            </button>
          </div>
        </form>
      </Details>

      <div className="grid gap-3 lg:grid-cols-2">
        {users.map((u) => {
          const [rbg, rfg] = ROLE_COLORS[u.role] ?? ROLE_COLORS.MEMBER;
          return (
            <Card key={u.id} className="flex flex-col gap-3 px-[18px] py-4">
              <div className="flex items-center gap-3.5">
                <Avatar name={u.name} color={u.avatarColor} src={avatarSrc(u)} size={36} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/people/${u.id}`}
                    className="text-[14px] font-semibold text-ink no-underline hover:text-brick"
                  >
                    {u.name}
                  </Link>
                  <div className="truncate text-[12.5px] text-muted">
                    {u.email} · joined {monthYear(u.createdAt)} · {u._count.contributions}{" "}
                    contributions
                  </div>
                  <div className="text-[12px] text-muted">
                    {u.sessions[0]
                      ? `Last sign-in ${relativeTime(u.sessions[0].createdAt)}`
                      : "Never signed in"}
                    {" · "}
                    <Link href={`/admin/users/${u.id}`} className="text-[12px]">
                      Activity
                    </Link>
                  </div>
                </div>
                <Pill bg={rbg} fg={rfg}>
                  {u.suspended ? "Suspended" : u.role}
                </Pill>
              </div>

              {u.id !== currentUserId ? (
                <div className="flex flex-wrap items-end gap-2 border-t border-line-soft pt-2.5">
                  <form action={setUserRoleAction} className="flex items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="!w-auto !py-1.5 !text-[12.5px]"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="LEAD">Lead (can post)</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="cursor-pointer border border-line-input bg-card px-3 py-1.5 text-[12px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                    >
                      Set role
                    </button>
                  </form>
                  <form action={toggleSuspendAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-muted hover:text-brick"
                    >
                      {u.suspended ? "Reinstate" : "Suspend"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="border-t border-line-soft pt-2.5 text-[12px] text-muted">
                  That&apos;s you.
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ── Audit ──────────────────────────────────────────────── */

async function AdminAudit() {
  const logs = await db.auditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <SectionLabel>Every action on the platform, in order</SectionLabel>
      {logs.length === 0 ? (
        <EmptyState title="Nothing logged yet." />
      ) : (
        <div className="flex flex-col">
          {logs.map((l) => (
            <div key={l.id} className="flex flex-col gap-0.5 border-b border-line-soft py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
              <div className="min-w-[110px] text-[12px] text-muted">{relativeTime(l.createdAt)}</div>
              <div className="min-w-[140px] text-[13px] font-semibold text-ink">
                {l.actor?.name ?? "System"}
              </div>
              <div className="flex-1 text-[13px] text-ink-3">
                <span className="font-mono text-[12px] text-brick">{l.action}</span>
                {l.targetType ? <span className="text-muted"> · {l.targetType}</span> : null}
                {l.meta ? <span className="text-ink-4"> · {l.meta}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
