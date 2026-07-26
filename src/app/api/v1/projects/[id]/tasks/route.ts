import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { audit, notify } from "@/lib/notify";
import { ApiHttpError, readJson, withApiAuth } from "@/lib/apiAuth";
import { serializeTask } from "@/lib/apiSerialize";
import { CREDIT_ROLES, TASK_EFFORTS } from "@/lib/enums";

export const dynamic = "force-dynamic";

async function resolveProject(idOrSlug: string) {
  return db.project.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true, leadId: true, title: true },
  });
}

/** GET /api/v1/projects/{id}/tasks — the project's task board (members only). */
export const GET = withApiAuth({ scope: "read" }, async (ctx, _req, params) => {
  const project = await resolveProject(params.id);
  if (!project) throw new ApiHttpError(404, "not_found", "Project not found.");
  const access = await getProjectAccess(project.id, project.leadId, ctx.user);
  if (!access.canSeeInternal) throw new ApiHttpError(403, "forbidden", "Task board is for project members.");

  const tasks = await db.task.findMany({
    where: { projectId: project.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ data: tasks.map(serializeTask) });
});

/** POST /api/v1/projects/{id}/tasks — create a task.
 *  Members may add a self-assigned task; managers get the full fields. */
export const POST = withApiAuth({ scope: "write" }, async (ctx, request, params) => {
  const project = await resolveProject(params.id);
  if (!project) throw new ApiHttpError(404, "not_found", "Project not found.");
  const access = await getProjectAccess(project.id, project.leadId, ctx.user);
  if (!access.isMember && !access.isAdmin) {
    throw new ApiHttpError(403, "forbidden", "Only project members can add tasks.");
  }
  const isManager = access.canManage;
  const body = await readJson(request);

  const title = String(body.title ?? "").trim();
  if (!title) throw new ApiHttpError(422, "invalid_title", "title is required.");

  const effort = TASK_EFFORTS.includes(String(body.effort) as never) ? String(body.effort) : "M";
  const creditRole =
    isManager && CREDIT_ROLES.includes(String(body.credit_role) as never)
      ? String(body.credit_role)
      : null;
  const assigneeId = isManager
    ? typeof body.assignee_id === "string"
      ? body.assignee_id
      : null
    : body.assign_self
      ? ctx.user.id
      : null;
  const due = body.due_date ? new Date(String(body.due_date)) : null;

  const task = await db.task.create({
    data: {
      projectId: project.id,
      title,
      description: String(body.description ?? ""),
      effort,
      creditRole,
      goodFirstTask: isManager && body.good_first_task === true,
      assigneeId,
      dueDate: due && !isNaN(due.getTime()) ? due : null,
      createdById: ctx.user.id,
    },
  });
  if (assigneeId && assigneeId !== ctx.user.id) {
    await notify(assigneeId, {
      type: "TASK_ASSIGNED",
      title: `Task assigned to you: ${title}`,
      body: `${ctx.user.name} assigned you a task on ${project.title}.`,
      link: `/projects/${project.slug}?tab=tasks`,
    });
  }
  await audit(ctx.user.id, "TASK_CREATE", "Project", project.id, `${title} (API)`);
  return NextResponse.json({ data: serializeTask(task) }, { status: 201 });
});
