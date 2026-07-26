import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { audit } from "@/lib/notify";
import { ApiHttpError, readJson, withApiAuth } from "@/lib/apiAuth";
import { serializeTask } from "@/lib/apiSerialize";
import { TASK_STATUSES } from "@/lib/enums";

export const dynamic = "force-dynamic";

/** PATCH /api/v1/tasks/{id} — update status and/or assignee.
 *  Mirrors the web rules: assignee/creator or a manager may move a task, and
 *  only a manager may confirm DONE (which writes the contribution ledger). */
export const PATCH = withApiAuth({ scope: "write" }, async (ctx, request, params) => {
  const task = await db.task.findUnique({
    where: { id: params.id },
    include: { project: { select: { id: true, slug: true, leadId: true, title: true } } },
  });
  if (!task) throw new ApiHttpError(404, "not_found", "Task not found.");

  const access = await getProjectAccess(task.project.id, task.project.leadId, ctx.user);
  const involved = task.assigneeId === ctx.user.id || task.createdById === ctx.user.id;
  if (!access.canManage && !involved) {
    throw new ApiHttpError(403, "forbidden", "You can't change this task.");
  }

  const body = await readJson(request);
  const data: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    const status = body.status;
    if (!TASK_STATUSES.includes(status as never)) {
      throw new ApiHttpError(422, "invalid_status", `status must be one of ${TASK_STATUSES.join(", ")}.`);
    }
    if (!access.canManage && status === "DONE") {
      throw new ApiHttpError(403, "forbidden", "Only a manager can confirm a task as done.");
    }
    data.status = status;
    data.completedAt = status === "DONE" ? new Date() : null;
  }
  if ("assignee_id" in body && access.canManage) {
    data.assigneeId = body.assignee_id ? String(body.assignee_id) : null;
  }
  if (Object.keys(data).length === 0) {
    throw new ApiHttpError(422, "no_fields", "Provide status and/or assignee_id.");
  }

  const updated = await db.task.update({ where: { id: task.id }, data });

  // Confirming DONE writes to the assignee's contribution ledger, as in the app.
  if (data.status === "DONE" && task.status !== "DONE" && task.assigneeId) {
    await db.contribution.create({
      data: {
        userId: task.assigneeId,
        projectId: task.project.id,
        text: task.title,
        type: task.creditRole?.startsWith("Writing")
          ? "WRITING"
          : task.creditRole === "Software"
            ? "CODE"
            : "DATA",
        creditRole: task.creditRole,
        taskId: task.id,
      },
    });
    if (task.creditRole) {
      const member = await db.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.project.id, userId: task.assigneeId } },
      });
      if (member) {
        const roles = new Set<string>(JSON.parse(member.creditRoles || "[]"));
        roles.add(task.creditRole);
        await db.projectMember.update({
          where: { id: member.id },
          data: { creditRoles: JSON.stringify([...roles]) },
        });
      }
    }
  }

  await audit(ctx.user.id, "TASK_STATUS", "Task", task.id, `${task.title} (API)`);
  return NextResponse.json({ data: serializeTask(updated) });
});
