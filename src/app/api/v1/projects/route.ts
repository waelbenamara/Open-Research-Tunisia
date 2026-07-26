import { NextResponse } from "next/server";
import { db, ilike } from "@/lib/db";
import { canCreateProject } from "@/lib/permissions";
import { slugify } from "@/lib/format";
import { audit, notify } from "@/lib/notify";
import { ApiHttpError, readJson, withApiAuth } from "@/lib/apiAuth";
import { serializeProject } from "@/lib/apiSerialize";
import { ETHICS_STATUSES, LICENSES, PROJECT_STAGES } from "@/lib/enums";

export const dynamic = "force-dynamic";

const LEAD_SELECT = { lead: { select: { id: true, name: true } } };

/** GET /api/v1/projects — list projects visible to the caller.
 *  Query: ?mine=true, ?recruiting=true, ?q=…, ?limit=… (max 100). */
export const GET = withApiAuth({ scope: "read" }, async (ctx, request) => {
  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "true";
  const recruiting = url.searchParams.get("recruiting") === "true";
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);

  const where: Record<string, unknown> = mine
    ? { OR: [{ leadId: ctx.user.id }, { members: { some: { userId: ctx.user.id } } }] }
    : { approvalStatus: "APPROVED", archived: false, isPublic: true };
  if (recruiting) where.openings = { some: { isOpen: true } };
  if (q) where.OR = [{ title: ilike(q) }, { summary: ilike(q) }, { area: ilike(q) }];

  const projects = await db.project.findMany({
    where,
    include: LEAD_SELECT,
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ data: projects.map(serializeProject) });
});

/** POST /api/v1/projects — create a project. Needs posting rights. Non-admins'
 *  projects start as `pending` (admin review), same as the web app. */
export const POST = withApiAuth({ scope: "write" }, async (ctx, request) => {
  if (!canCreateProject(ctx.user)) {
    throw new ApiHttpError(403, "no_posting_rights", "You need posting rights to create a project.");
  }
  const body = await readJson(request);

  const title = String(body.title ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  const area = String(body.area ?? "").trim();
  if (title.length < 8) throw new ApiHttpError(422, "invalid_title", "title must be at least 8 characters.");
  if (summary.length < 30) throw new ApiHttpError(422, "invalid_summary", "summary must be at least 30 characters.");
  if (area.length < 2) throw new ApiHttpError(422, "invalid_area", "area is required.");

  const stage = pick(body.stage, [...PROJECT_STAGES], "Proposal");
  const ethicsStatus = pick(body.ethics_status, [...ETHICS_STATUSES], "NOT_REQUIRED");
  const license = pick(body.license, [...LICENSES], "CC-BY-4.0");
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
    : [];

  let slug = slugify(title) || "project";
  if (await db.project.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const approvalStatus = ctx.user.role === "ADMIN" ? "APPROVED" : "PENDING";

  const project = await db.project.create({
    data: {
      slug,
      approvalStatus,
      title,
      summary,
      about: String(body.about ?? ""),
      area,
      stage,
      tags: JSON.stringify(tags),
      language: String(body.language ?? "English"),
      commitment: String(body.commitment ?? "Flexible"),
      ethicsStatus,
      license,
      dataStatement: body.data_statement ? String(body.data_statement) : null,
      leadId: ctx.user.id,
      members: {
        create: {
          userId: ctx.user.id,
          projectRole: "LEAD",
          roleTitle: "Project lead",
          creditRoles: JSON.stringify(["Conceptualization", "Project administration"]),
          authorOrder: 1,
        },
      },
    },
    include: LEAD_SELECT,
  });

  // Optional openings: [{ role, skills?, seats? }]
  if (Array.isArray(body.openings)) {
    const rows = body.openings
      .slice(0, 10)
      .map((o) => {
        const r = o as Record<string, unknown>;
        const role = String(r.role ?? "").trim();
        return role
          ? {
              projectId: project.id,
              role,
              skills: String(r.skills ?? "").trim(),
              seats: Math.min(Math.max(Math.trunc(Number(r.seats)) || 1, 1), 50),
            }
          : null;
      })
      .filter(Boolean) as { projectId: string; role: string; skills: string; seats: number }[];
    if (rows.length) await db.opening.createMany({ data: rows });
  }

  if (approvalStatus === "PENDING") {
    const admins = await db.user.findMany({
      where: { role: "ADMIN", suspended: false },
      select: { id: true },
    });
    await notify(admins.map((a) => a.id), {
      type: "PROJECT_REVIEW",
      title: "Project awaiting approval",
      body: `${ctx.user.name} submitted “${title}” via the API.`,
      link: "/admin?tab=projects",
    });
  }
  await audit(ctx.user.id, "PROJECT_CREATE", "Project", project.id, `${title} (API)`);

  return NextResponse.json({ data: serializeProject(project) }, { status: 201 });
});

function pick(v: unknown, allowed: string[], fallback: string): string {
  const s = String(v ?? "");
  return allowed.includes(s) ? s : fallback;
}
