import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/permissions";
import { parseList } from "@/lib/format";
import { addOpeningAction, toggleOpeningAction } from "@/actions/projects";
import { Breadcrumb, Card, Field, SectionLabel } from "@/components/ui";
import { Details } from "@/components/Collapse";
import { ProjectForm } from "@/components/ProjectForm";
import { DeleteProject } from "@/components/DeleteProject";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/projects/${slug}/edit`);

  const project = await db.project.findUnique({
    where: { slug },
    include: {
      openings: { orderBy: { isOpen: "desc" } },
      _count: { select: { members: true, contributions: true } },
    },
  });
  if (!project) notFound();

  const access = await getProjectAccess(project.id, project.leadId, user);
  if (!access.canManage) redirect(`/projects/${slug}`);
  // Deleting is heavier than editing — lead or admin only, not maintainers.
  const canDelete = access.isLead || access.isAdmin;

  const workshops = await db.workshop.findMany({
    select: { id: true, title: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 sm:px-8 pb-24 pt-7">
      <Breadcrumb href={`/projects/${slug}`} label={project.title} current="Edit" />
      <h1 className="mb-8 font-serif text-[32px] font-medium">Edit project</h1>

      <ProjectForm
        mode="edit"
        workshops={workshops}
        values={{
          id: project.id,
          title: project.title,
          summary: project.summary,
          about: project.about,
          area: project.area,
          stage: project.stage,
          tags: parseList(project.tags).join(", "),
          language: project.language,
          commitment: project.commitment,
          ethicsStatus: project.ethicsStatus,
          ethicsNote: project.ethicsNote ?? "",
          license: project.license,
          dataStatement: project.dataStatement ?? "",
          linkedWorkshopId: project.linkedWorkshopId ?? "",
        }}
      />

      <div className="mt-12 border-t border-line pt-9">
        <SectionLabel>Open roles</SectionLabel>
        <Details label="+ Add a role">
          <form action={addOpeningAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="projectId" value={project.id} />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Role">
                <input name="role" required placeholder="Data analyst" />
              </Field>
              <Field label="Skills needed">
                <input name="skills" placeholder="Python, pandas — workshop available" />
              </Field>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Commitment">
                <input name="commitment" defaultValue="2–4 hours / week" />
              </Field>
              <Field label="Pod" hint="optional">
                <input name="pod" placeholder="Data pod" />
              </Field>
              <Field label="Seats">
                <input name="seats" type="number" min={1} defaultValue={1} />
              </Field>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                style={{ color: "#faf8f3" }}
              >
                Add role
              </button>
            </div>
          </form>
        </Details>

        <div className="flex flex-col gap-2.5">
          {project.openings.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center gap-3.5 px-5 py-3.5">
              <div className="min-w-[200px] flex-1">
                <div className="text-[14px] font-semibold">{o.role}</div>
                <div className="mt-0.5 text-[12.5px] text-muted">
                  {[o.skills, o.commitment, o.pod].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className="text-[12px] text-muted">{o.isOpen ? "Open" : "Closed"}</span>
              <form action={toggleOpeningAction}>
                <input type="hidden" name="openingId" value={o.id} />
                <button
                  type="submit"
                  className="cursor-pointer border border-line-input bg-card px-3.5 py-1.5 text-[12px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                >
                  {o.isOpen ? "Close role" : "Reopen"}
                </button>
              </form>
            </Card>
          ))}
        </div>
      </div>

      {canDelete ? (
        <div className="mt-12 border-t border-line pt-9">
          <SectionLabel>Danger zone</SectionLabel>
          <DeleteProject
            projectId={project.id}
            title={project.title}
            members={project._count.members}
            contributions={project._count.contributions}
          />
        </div>
      ) : null}
    </div>
  );
}
