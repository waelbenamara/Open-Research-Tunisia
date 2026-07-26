import { parseList } from "./format";

/** Stable public shapes for the v1 API, so responses don't leak internal
 *  columns and stay consistent as the schema evolves. */

export function serializeProject(p: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  about: string;
  area: string;
  stage: string;
  tags: string;
  language: string;
  commitment: string;
  ethicsStatus: string;
  license: string;
  approvalStatus: string;
  archived: boolean;
  startedAt: Date;
  createdAt: Date;
  lead?: { id: string; name: string } | null;
}) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    about: p.about,
    area: p.area,
    stage: p.stage,
    tags: parseList(p.tags),
    language: p.language,
    commitment: p.commitment,
    ethics_status: p.ethicsStatus,
    license: p.license,
    approval_status: p.approvalStatus,
    archived: p.archived,
    lead: p.lead ? { id: p.lead.id, name: p.lead.name } : null,
    url: `/projects/${p.slug}`,
    started_at: p.startedAt.toISOString(),
    created_at: p.createdAt.toISOString(),
  };
}

export function serializeTask(t: {
  id: string;
  title: string;
  description: string;
  status: string;
  effort: string;
  pod: string | null;
  goodFirstTask: boolean;
  creditRole: string | null;
  dueDate: Date | null;
  assigneeId: string | null;
  createdById: string;
  createdAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    effort: t.effort,
    pod: t.pod,
    good_first_task: t.goodFirstTask,
    credit_role: t.creditRole,
    due_date: t.dueDate ? t.dueDate.toISOString() : null,
    assignee_id: t.assigneeId,
    created_by_id: t.createdById,
    created_at: t.createdAt.toISOString(),
    completed_at: t.completedAt ? t.completedAt.toISOString() : null,
  };
}

export function serializeWorkshop(w: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: string;
  format: string;
  status: string;
  startDate: Date;
  facilitator?: { id: string; name: string } | null;
}) {
  return {
    id: w.id,
    slug: w.slug,
    title: w.title,
    summary: w.summary,
    level: w.level,
    format: w.format,
    status: w.status,
    start_date: w.startDate.toISOString(),
    facilitator: w.facilitator ? { id: w.facilitator.id, name: w.facilitator.name } : null,
    url: `/workshops/${w.slug}`,
  };
}
