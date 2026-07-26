import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { audit } from "@/lib/notify";
import { ApiHttpError, readJson, withApiAuth } from "@/lib/apiAuth";
import { serializeProject } from "@/lib/apiSerialize";
import { PROJECT_STAGES } from "@/lib/enums";

export const dynamic = "force-dynamic";

/** Resolve a project by id OR slug. */
async function findProject(idOrSlug: string) {
  return db.project.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { lead: { select: { id: true, name: true } } },
  });
}

/** GET /api/v1/projects/{id_or_slug} */
export const GET = withApiAuth({ scope: "read" }, async (ctx, _req, params) => {
  const project = await findProject(params.id);
  if (!project) throw new ApiHttpError(404, "not_found", "Project not found.");
  const access = await getProjectAccess(project.id, project.leadId, ctx.user);
  if (project.approvalStatus !== "APPROVED" && !access.canManage) {
    throw new ApiHttpError(404, "not_found", "Project not found.");
  }
  return NextResponse.json({ data: serializeProject(project) });
});

/** PATCH /api/v1/projects/{id_or_slug} — update fields (managers only). */
export const PATCH = withApiAuth({ scope: "write" }, async (ctx, request, params) => {
  const project = await findProject(params.id);
  if (!project) throw new ApiHttpError(404, "not_found", "Project not found.");
  const access = await getProjectAccess(project.id, project.leadId, ctx.user);
  if (!access.canManage) throw new ApiHttpError(403, "forbidden", "You can't manage this project.");

  const body = await readJson(request);
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim().length >= 8) data.title = body.title.trim();
  if (typeof body.summary === "string" && body.summary.trim().length >= 30)
    data.summary = body.summary.trim();
  if (typeof body.about === "string") data.about = body.about;
  if (typeof body.stage === "string" && PROJECT_STAGES.includes(body.stage as never))
    data.stage = body.stage;
  if (Array.isArray(body.tags))
    data.tags = JSON.stringify(body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8));

  if (Object.keys(data).length === 0) {
    throw new ApiHttpError(422, "no_fields", "No updatable fields provided.");
  }
  const updated = await db.project.update({
    where: { id: project.id },
    data,
    include: { lead: { select: { id: true, name: true } } },
  });
  await audit(ctx.user.id, "PROJECT_UPDATE", "Project", project.id, "API");
  return NextResponse.json({ data: serializeProject(updated) });
});
