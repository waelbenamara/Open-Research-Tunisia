import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { avatarSrc, fullDate, monthYear, parseList } from "@/lib/format";
import { PROJECT_STAGES } from "@/lib/enums";
import { stagePill, statusPill } from "@/lib/theme";
import { Avatar, Breadcrumb, Card, Pill, Shell, SectionLabel } from "@/components/ui";
import { ApplyPanel } from "./ApplyPanel";
import { OverviewTab } from "./tabs/OverviewTab";
import { ResourcesTab } from "./tabs/ResourcesTab";
import { MeetingsTab } from "./tabs/MeetingsTab";
import { DiscussionTab } from "./tabs/DiscussionTab";
import { TeamTab } from "./tabs/TeamTab";
import { TasksTab } from "./tabs/TasksTab";
import { ApplicationsTab } from "./tabs/ApplicationsTab";
import { OutputsTab } from "./tabs/OutputsTab";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    select: { title: true, summary: true, approvalStatus: true },
  });
  // Unapproved projects shouldn't leak their titles into metadata.
  if (!project || project.approvalStatus !== "APPROVED") return {};
  return { title: project.title, description: project.summary };
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "overview" } = await searchParams;
  const user = await getCurrentUser();

  const project = await db.project.findUnique({
    where: { slug },
    include: {
      lead: true,
      linkedWorkshop: { select: { slug: true, title: true, startDate: true, facilitator: { select: { name: true } } } },
      openings: { orderBy: { isOpen: "desc" } },
      members: {
        include: { user: true },
        orderBy: [{ authorOrder: "asc" }, { joinedAt: "asc" }],
      },
      announcements: { include: { author: true }, orderBy: { createdAt: "desc" } },
      outputs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) notFound();

  const access = await getProjectAccess(project.id, project.leadId, user);

  // A project awaiting (or denied) approval exists only for its managers and
  // admins — 404 for everyone else, so its existence isn't confirmed.
  if (project.approvalStatus !== "APPROVED" && !access.canManage) notFound();

  const myApplication = user
    ? await db.application.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: user.id } },
      })
    : null;

  const pendingCount = access.canReview
    ? await db.application.count({
        where: { projectId: project.id, status: { in: ["PENDING", "UNDER_REVIEW"] } },
      })
    : 0;

  // The board, meeting notes, and discussion are the team's working space —
  // visible to project members and admins only. The public face of a project
  // is its overview, public resources, team credit, and outputs.
  const openTaskCount = access.canSeeInternal
    ? await db.task.count({ where: { projectId: project.id, status: { not: "DONE" } } })
    : 0;

  const pill = stagePill(project.stage);
  const tags = parseList(project.tags);
  const openOpenings = project.openings.filter((o) => o.isOpen);

  const tabs: [string, string][] = [
    ["overview", "Overview"],
    ["resources", "Resources"],
  ];
  if (access.canSeeInternal) {
    tabs.push(
      ["tasks", `Tasks${openTaskCount ? ` (${openTaskCount})` : ""}`],
      ["meetings", "Meeting notes"],
      ["discussion", "Discussion"],
    );
  }
  tabs.push(["team", "Team & credit"], ["outputs", "Outputs"]);
  if (access.canReview) tabs.push(["applications", `Applications${pendingCount ? ` (${pendingCount})` : ""}`]);

  const stageIdx = PROJECT_STAGES.indexOf(project.stage as (typeof PROJECT_STAGES)[number]);

  return (
    <Shell className="pb-24 pt-7">
      <Breadcrumb href="/" label="Discover" current="Research project" />

      {project.approvalStatus === "PENDING" ? (
        <div className="mb-6 border-l-2 border-gold bg-gold-tint/50 px-5 py-3.5 text-[13.5px] leading-relaxed text-ink-2">
          <span className="font-semibold">Awaiting admin approval.</span> Only you and admins can
          see this page. It will appear on Discover and accept applications once approved.
        </div>
      ) : null}
      {project.approvalStatus === "REJECTED" ? (
        <div className="mb-6 border-l-2 border-brick bg-brick-tint/60 px-5 py-3.5 text-[13.5px] leading-relaxed text-ink-2">
          <span className="font-semibold">Changes requested by an admin.</span>{" "}
          {project.approvalNote ? <>“{project.approvalNote}” — </> : null}
          Edit the project and save to resubmit it for review.
        </div>
      ) : null}

      <div className="grid items-start gap-12 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <Pill bg={pill.bg} fg={pill.fg}>
              {project.stage}
            </Pill>
            <span className="text-[12.5px] text-muted">
              {project.area} · Started {monthYear(project.startedAt)}
            </span>
            {project.ethicsStatus === "APPROVED" ? (
              <Pill bg="#e4ecdb" fg="#3e5730">
                Ethics approved
              </Pill>
            ) : project.ethicsStatus === "PENDING" ? (
              <Pill bg="#f4ead2" fg="#7a5b16">
                Ethics review pending
              </Pill>
            ) : null}
          </div>

          <h1 className="mb-3.5 font-serif text-[38px] font-medium leading-[1.15] balance">
            {project.title}
          </h1>
          <p className="mb-5 text-[16px] leading-[1.6] text-ink-3 pretty">{project.summary}</p>

          <div className="mb-7 flex items-center gap-3">
            <Avatar name={project.lead.name} color={project.lead.avatarColor} src={avatarSrc(project.lead)} size={38} />
            <div>
              <Link
                href={`/people/${project.lead.id}`}
                className="text-[14px] font-semibold text-ink no-underline hover:text-brick"
              >
                {project.lead.name}
              </Link>
              <div className="text-[12.5px] text-muted">
                Project lead{project.lead.affiliation ? ` · ${project.lead.affiliation}` : ""}
              </div>
            </div>
            {access.canManage ? (
              <>
                <div className="flex-1" />
                <Link
                  href={`/projects/${project.slug}/edit`}
                  className="border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 no-underline hover:border-brick hover:text-brick hover:no-underline"
                >
                  Edit project
                </Link>
              </>
            ) : null}
          </div>

          <div className="mb-7 flex gap-6 overflow-x-auto border-b border-line">
            {tabs.map(([key, label]) => {
              const active = tab === key;
              return (
                <Link
                  key={key}
                  href={`/projects/${project.slug}?tab=${key}`}
                  scroll={false}
                  className="whitespace-nowrap px-0.5 pb-3 text-[14px] no-underline hover:no-underline"
                  style={{
                    fontWeight: active ? 600 : 400,
                    color: active ? "#211d16" : "#6e675a",
                    borderBottom: `2px solid ${active ? "#8a3325" : "transparent"}`,
                    marginBottom: -1,
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {tab === "overview" ? (
            <OverviewTab project={project} stageIdx={stageIdx} access={access} tags={tags} />
          ) : null}
          {tab === "resources" ? (
            <ResourcesTab projectId={project.id} access={access} signedIn={!!user} />
          ) : null}
          {tab === "tasks" && access.canSeeInternal ? (
            <TasksTab projectId={project.id} access={access} members={project.members} userId={user?.id ?? null} />
          ) : null}
          {tab === "meetings" && access.canSeeInternal ? (
            <MeetingsTab projectId={project.id} access={access} />
          ) : null}
          {tab === "discussion" && access.canSeeInternal ? (
            <DiscussionTab projectId={project.id} access={access} slug={project.slug} />
          ) : null}
          {tab === "team" ? <TeamTab project={project} access={access} /> : null}
          {tab === "outputs" ? (
            <OutputsTab projectId={project.id} outputs={project.outputs} access={access} />
          ) : null}
          {tab === "applications" && access.canReview ? (
            <ApplicationsTab projectId={project.id} />
          ) : null}
        </div>

        {/* Right rail */}
        <aside className="flex flex-col gap-4.5 lg:sticky lg:top-[88px]">
          <ApplyPanel
            projectId={project.id}
            projectTitle={project.title}
            leadName={project.lead.name}
            openings={openOpenings.map((o) => ({ id: o.id, role: o.role, skills: o.skills }))}
            status={myApplication?.status ?? null}
            decisionNote={myApplication?.decisionNote ?? null}
            isMember={access.isMember}
            signedIn={!!user}
            slug={project.slug}
          />

          {openOpenings.length > 0 ? (
            <Card className="p-6">
              <SectionLabel>Open roles</SectionLabel>
              <div className="flex flex-col gap-3">
                {openOpenings.map((o) => (
                  <div key={o.id} className="border-b border-line-soft pb-2.5 last:border-0 last:pb-0">
                    <div className="text-[14px] font-semibold">{o.role}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted">{o.skills}</div>
                    <div className="mt-0.5 text-[12px] text-muted">{o.commitment}</div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {project.linkedWorkshop ? (
            <Card className="p-6">
              <SectionLabel>Linked workshop</SectionLabel>
              <Link
                href={`/workshops/${project.linkedWorkshop.slug}`}
                className="text-[14.5px] font-semibold no-underline"
              >
                {project.linkedWorkshop.title}
              </Link>
              <div className="mt-1 text-[12.5px] text-muted">
                Starts {fullDate(project.linkedWorkshop.startDate)} ·{" "}
                {project.linkedWorkshop.facilitator.name}
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-4">
                Skills from this workshop feed directly into the project.
              </p>
            </Card>
          ) : null}

          <Card className="p-6">
            <SectionLabel>Openness &amp; governance</SectionLabel>
            <dl className="flex flex-col gap-2.5 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">License</dt>
                <dd className="font-semibold text-ink">{project.license}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Working language</dt>
                <dd className="font-semibold text-ink">{project.language}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Commitment</dt>
                <dd className="font-semibold text-ink">{project.commitment}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Ethics</dt>
                <dd className="font-semibold text-ink">
                  {project.ethicsStatus === "NOT_REQUIRED"
                    ? "Not required"
                    : project.ethicsStatus === "PENDING"
                      ? "Under review"
                      : "Approved"}
                </dd>
              </div>
            </dl>
            {project.dataStatement ? (
              <p className="mt-3 border-t border-line-soft pt-3 text-[12.5px] leading-relaxed text-ink-4">
                {project.dataStatement}
              </p>
            ) : null}
          </Card>

          {tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="bg-tint px-2.5 py-1 text-[11.5px] text-ink-3">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </Shell>
  );
}
