import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fullDate } from "@/lib/format";
import { stagePill } from "@/lib/theme";
import { Card, EmptyState, LinkButton, Pill, SectionLabel } from "@/components/ui";

export const metadata = { title: "Welcome" };

function parseSkills(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [me, applicationCount, membershipCount, enrollmentCount, recruiting, workshops, goodFirstTasks] =
    await Promise.all([
      db.user.findUnique({ where: { id: user.id }, select: { skills: true } }),
      db.application.count({ where: { userId: user.id, status: { not: "WITHDRAWN" } } }),
      db.projectMember.count({ where: { userId: user.id } }),
      db.enrollment.count({ where: { userId: user.id, status: { not: "DROPPED" } } }),
      db.project.findMany({
        where: { archived: false, approvalStatus: "APPROVED", openings: { some: { isOpen: true } } },
        include: { lead: { select: { name: true } }, openings: { where: { isOpen: true } } },
        take: 3,
        orderBy: { startedAt: "desc" },
      }),
      db.workshop.findMany({
        where: { status: "OPEN" },
        include: { facilitator: { select: { name: true } } },
        take: 3,
        orderBy: { startDate: "asc" },
      }),
      db.task.findMany({
        where: { goodFirstTask: true, status: "OPEN", assigneeId: null },
        include: { project: { select: { slug: true, title: true } } },
        take: 4,
      }),
    ]);

  // Each step is "done" from real records, so returning members see progress,
  // not a static brochure.
  const hasSkills = parseSkills(me?.skills ?? "[]").length > 0;
  const hasProject = applicationCount + membershipCount > 0;
  const hasWorkshop = enrollmentCount > 0;
  const doneCount = [hasSkills, hasProject, hasWorkshop].filter(Boolean).length;
  const allDone = doneCount === 3;

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 sm:px-8 pb-24 pt-16">
      <div className="eyebrow mb-2.5" style={{ color: "#8a3325" }}>
        Welcome, {user.name.split(" ")[0]}
      </div>
      <h1 className="font-serif text-[38px] font-medium leading-[1.12] balance">
        {allDone ? "You're set up. Now the real work." : "Three steps and you're contributing."}
      </h1>
      <p className="mt-3 max-w-[58ch] text-[16px] leading-relaxed text-ink-3 pretty">
        {allDone
          ? "Skills listed, project picked, workshop joined — from here your contribution ledger does the talking."
          : "Nobody here started as a researcher. The people who go furthest do the same three things first."}
      </p>
      {doneCount > 0 && !allDone ? (
        <p className="mt-2 text-[13px] font-semibold text-olive">{doneCount} of 3 done</p>
      ) : null}

      <ol className="mt-10 flex flex-col gap-6">
        <Step
          n={1}
          done={hasSkills}
          title="Tell us what you can do"
          body="Project leads search the directory by skill. Even 'Excel, Arabic transcription, patient' gets you found — vagueness doesn't."
          cta={
            <LinkButton href="/profile/edit" variant={hasSkills ? "secondary" : undefined}>
              {hasSkills ? "Update your skills" : "Add your skills"}
            </LinkButton>
          }
        />
        <Step
          n={2}
          done={hasProject}
          title="Pick a project that's recruiting"
          body="Read the open roles, not the title. Several of them explicitly want people with no research background."
          cta={
            <LinkButton href="/?filter=recruiting" variant="secondary">
              Browse projects
            </LinkButton>
          }
        />
        <Step
          n={3}
          done={hasWorkshop}
          title="Close the skill gap with a workshop"
          body="Every workshop is free, recorded, and linked to a live project. Attend enough sessions and you get a verifiable certificate."
          cta={
            <LinkButton href="/?filter=workshops" variant="secondary">
              See workshops
            </LinkButton>
          }
        />
      </ol>

      {goodFirstTasks.length > 0 ? (
        <div className="mt-12">
          <SectionLabel>Good first tasks — scoped small on purpose</SectionLabel>
          <div className="flex flex-col gap-2">
            {goodFirstTasks.map((t) => (
              <Card key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-[200px] flex-1 text-[13.5px] font-semibold">{t.title}</div>
                <Link href={`/projects/${t.project.slug}?tab=tasks`} className="text-[12.5px]">
                  {t.project.title}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <SectionLabel>Recruiting now</SectionLabel>
          {recruiting.length === 0 ? (
            <EmptyState
              title="Nothing is recruiting right now"
              hint="New projects post open roles regularly — check back, or bookmark the ones you like."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {recruiting.map((p) => {
                const pill = stagePill(p.stage);
                return (
                  <Card key={p.id} hover className="p-5">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Pill bg={pill.bg} fg={pill.fg}>
                        {p.stage}
                      </Pill>
                      <span className="text-[12px] text-muted">
                        {p.openings.length} open role{p.openings.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <Link
                      href={`/projects/${p.slug}`}
                      className="font-serif text-[17px] font-medium no-underline"
                    >
                      {p.title}
                    </Link>
                    <div className="mt-1 text-[12.5px] text-muted">{p.lead.name}</div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <SectionLabel>Upcoming workshops</SectionLabel>
          {workshops.length === 0 ? (
            <EmptyState
              title="No workshops are open for enrolment"
              hint="Workshops are announced to all members — you won't miss the next one."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {workshops.map((w) => (
                <Card key={w.id} hover className="p-5">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-olive">
                    {w.level}
                  </div>
                  <Link
                    href={`/workshops/${w.slug}`}
                    className="font-serif text-[17px] font-medium no-underline"
                  >
                    {w.title}
                  </Link>
                  <div className="mt-1 text-[12.5px] text-muted">
                    {w.facilitator.name} · starts {fullDate(w.startDate)}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 border-t border-line pt-7 text-[13.5px] text-ink-4">
        Prefer to just look around? <Link href="/">Go to Discover</Link>.
      </div>
    </div>
  );
}

function Step({
  n,
  done,
  title,
  body,
  cta,
}: {
  n: number;
  done?: boolean;
  title: string;
  body: string;
  cta: React.ReactNode;
}) {
  return (
    <li className="flex gap-5 border-b border-line-soft pb-6">
      <div
        className={`font-serif text-[32px] font-medium leading-none ${done ? "text-olive" : "text-brick"}`}
        aria-hidden
      >
        {done ? "✓" : n}
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2.5">
          <div className="text-[17px] font-semibold">{title}</div>
          {done ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-olive">
              Done
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-3 pretty">{body}</p>
        <div className="mt-3">{cta}</div>
      </div>
    </li>
  );
}
