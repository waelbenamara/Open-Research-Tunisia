"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getProjectAccess, canCreateProject } from "@/lib/permissions";
import { audit, notify, projectAudience } from "@/lib/notify";
import { slugify } from "@/lib/format";
import { deleteObject, kindFromExt, storeUpload } from "@/lib/storage";
import {
  CONTRIBUTION_TYPES,
  CREDIT_ROLES,
  ETHICS_STATUSES,
  LICENSES,
  OUTPUT_STATUSES,
  OUTPUT_TYPES,
  PROJECT_ROLES,
  PROJECT_STAGES,
  RESOURCE_KINDS,
  TASK_EFFORTS,
  TASK_STATUSES,
  VISIBILITIES,
} from "@/lib/enums";
import type { ActionState } from "./auth";

const oneOf = (list: readonly string[], v: string) => list.includes(v);

async function loadProject(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      slug: true,
      leadId: true,
      title: true,
      archived: true,
      approvalStatus: true,
    },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

async function notifyAdmins(n: { type: string; title: string; body?: string; link?: string }) {
  const admins = await db.user.findMany({
    where: { role: "ADMIN", suspended: false },
    select: { id: true },
  });
  await notify(admins.map((a) => a.id), n);
}

async function assertManage(projectId: string) {
  const user = await requireUser();
  const project = await loadProject(projectId);
  const access = await getProjectAccess(project.id, project.leadId, user);
  if (!access.canManage) throw new Error("FORBIDDEN");
  return { user, project, access };
}

/* ── Create / edit a project ────────────────────────────── */

const projectSchema = z.object({
  title: z.string().trim().min(8, "Give the project a descriptive title."),
  summary: z.string().trim().min(30, "Write a one-paragraph summary (at least 30 characters)."),
  about: z.string().trim().default(""),
  area: z.string().trim().min(2, "Pick a research area."),
  stage: z.string().default("Proposal"),
  tags: z.string().default(""),
  language: z.string().default("English"),
  commitment: z.string().default("Flexible"),
  ethicsStatus: z.string().default("NOT_REQUIRED"),
  ethicsNote: z.string().trim().optional(),
  license: z.string().default("CC-BY-4.0"),
  dataStatement: z.string().trim().optional(),
  linkedWorkshopId: z.string().optional(),
});

/** The selects are fixed lists in the UI, but the wire is still untrusted. */
function validateProjectEnums(d: z.infer<typeof projectSchema>): ActionState {
  if (!oneOf([...PROJECT_STAGES, "OnHold"], d.stage)) return { error: "Invalid stage." };
  if (!oneOf(ETHICS_STATUSES, d.ethicsStatus)) return { error: "Invalid ethics status." };
  if (!oneOf(LICENSES, d.license)) return { error: "Invalid licence." };
  return null;
}

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canCreateProject(user)) {
    return { error: "You need posting rights to create a project. Request them from your profile." };
  }

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const invalid = validateProjectEnums(d);
  if (invalid) return invalid;

  const tags = d.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  let slug = slugify(d.title);
  if (await db.project.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Admin projects go live immediately; everyone else's wait for admin review.
  const approvalStatus = user.role === "ADMIN" ? "APPROVED" : "PENDING";

  const project = await db.project.create({
    data: {
      slug,
      approvalStatus,
      title: d.title,
      summary: d.summary,
      about: d.about,
      area: d.area,
      stage: d.stage,
      tags: JSON.stringify(tags),
      language: d.language,
      commitment: d.commitment,
      ethicsStatus: d.ethicsStatus,
      ethicsNote: d.ethicsNote || null,
      license: d.license,
      dataStatement: d.dataStatement || null,
      linkedWorkshopId: d.linkedWorkshopId || null,
      leadId: user.id,
      members: {
        create: {
          userId: user.id,
          projectRole: "LEAD",
          roleTitle: "Project lead",
          creditRoles: JSON.stringify(["Conceptualization", "Project administration"]),
          authorOrder: 1,
        },
      },
    },
  });

  // Openings arrive as structured JSON from the dynamic form; the legacy
  // "Role | skills" one-per-line format is still accepted as a fallback.
  const openings: { projectId: string; role: string; skills: string; seats: number }[] = [];
  const openingsJson = String(formData.get("openingsJson") || "").trim();
  if (openingsJson) {
    try {
      const arr: unknown = JSON.parse(openingsJson);
      if (Array.isArray(arr)) {
        for (const o of arr.slice(0, 10)) {
          const role = String((o as { role?: unknown }).role ?? "").trim();
          if (!role) continue;
          openings.push({
            projectId: project.id,
            role,
            skills: String((o as { skills?: unknown }).skills ?? "").trim(),
            seats: Math.min(Math.max(Math.trunc(Number((o as { seats?: unknown }).seats)) || 1, 1), 50),
          });
        }
      }
    } catch {
      // Malformed JSON just means no openings — the project itself is fine.
    }
  } else {
    const openingsRaw = String(formData.get("openings") || "").trim();
    for (const line of openingsRaw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10)) {
      const [role, skills = ""] = line.split("|").map((s) => s.trim());
      if (role) openings.push({ projectId: project.id, role, skills, seats: 1 });
    }
  }
  if (openings.length) await db.opening.createMany({ data: openings });

  if (approvalStatus === "PENDING") {
    await notifyAdmins({
      type: "PROJECT_REVIEW",
      title: "Project awaiting approval",
      body: `${user.name} submitted “${project.title}”.`,
      link: "/admin?tab=projects",
    });
  }

  await audit(user.id, "PROJECT_CREATE", "Project", project.id, project.title);
  redirect(`/projects/${project.slug}`);
}

export async function updateProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get("projectId"));
  const { user, project } = await assertManage(projectId);

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const invalid = validateProjectEnums(d);
  if (invalid) return invalid;

  // Editing a rejected project resubmits it for review automatically.
  const resubmit = project.approvalStatus === "REJECTED" && user.role !== "ADMIN";

  await db.project.update({
    where: { id: projectId },
    data: {
      title: d.title,
      summary: d.summary,
      about: d.about,
      area: d.area,
      stage: d.stage,
      tags: JSON.stringify(
        d.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
      ),
      language: d.language,
      commitment: d.commitment,
      ethicsStatus: d.ethicsStatus,
      ethicsNote: d.ethicsNote || null,
      license: d.license,
      dataStatement: d.dataStatement || null,
      linkedWorkshopId: d.linkedWorkshopId || null,
      ...(resubmit ? { approvalStatus: "PENDING", approvalNote: null } : {}),
    },
  });

  if (resubmit) {
    await notifyAdmins({
      type: "PROJECT_REVIEW",
      title: "Project resubmitted for approval",
      body: `${user.name} revised “${d.title}”.`,
      link: "/admin?tab=projects",
    });
  }

  await audit(user.id, "PROJECT_UPDATE", "Project", projectId);
  revalidatePath(`/projects/${project.slug}`);
  return {
    success: resubmit ? "Project updated and resubmitted for review." : "Project updated.",
  };
}

export async function setProjectStageAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const stage = String(formData.get("stage"));
  // "Archived" is reserved for the admin archive action.
  if (!oneOf([...PROJECT_STAGES, "OnHold"], stage)) throw new Error("Invalid stage.");
  const { user, project } = await assertManage(projectId);

  await db.project.update({ where: { id: projectId }, data: { stage } });
  await audit(user.id, "PROJECT_STAGE", "Project", projectId, stage);
  await notify(await projectAudience(projectId, user.id), {
    type: "PROJECT_STAGE",
    title: `${project.title} moved to ${stage}`,
    body: `The project lead advanced the project to the ${stage} stage.`,
    link: `/projects/${project.slug}`,
  });
  revalidatePath(`/projects/${project.slug}`);
}

/* ── Applications ───────────────────────────────────────── */

export async function applyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId"));
  const project = await loadProject(projectId);

  if (project.approvalStatus !== "APPROVED" || project.archived) {
    return { error: "This project isn't accepting applications." };
  }

  const roleApplied = String(formData.get("roleApplied") || "").trim();
  const motivation = String(formData.get("motivation") || "").trim();
  const skills = String(formData.get("skills") || "").trim();
  const availability = String(formData.get("availability") || "2–4 hours");
  const cvUrl = String(formData.get("cvUrl") || "").trim();
  const openingId = String(formData.get("openingId") || "").trim();

  if (!motivation) {
    return { error: "Please tell us why you'd like to contribute — one sentence is enough." };
  }

  const existing = await db.application.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (existing && existing.status !== "WITHDRAWN") {
    return { error: "You've already applied to this project." };
  }

  const data = {
    projectId,
    userId: user.id,
    openingId: openingId || null,
    roleApplied: roleApplied || "Contributor",
    motivation,
    skills,
    availability,
    cvUrl: cvUrl || null,
    status: "PENDING",
    decidedAt: null,
    decidedById: null,
    decisionNote: null,
  };

  if (existing) {
    await db.application.update({ where: { id: existing.id }, data });
  } else {
    await db.application.create({ data });
  }

  await audit(user.id, "APPLICATION_SUBMIT", "Project", projectId, data.roleApplied);
  await notify(project.leadId, {
    type: "APPLICATION",
    title: `New application to ${project.title}`,
    body: `${user.name} applied for ${data.roleApplied}.`,
    link: `/projects/${project.slug}?tab=applications`,
  });

  revalidatePath(`/projects/${project.slug}`);
  return { success: "Application sent." };
}

export async function withdrawApplicationAction(formData: FormData) {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId"));
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { project: { select: { slug: true } } },
  });
  if (!app || app.userId !== user.id) throw new Error("FORBIDDEN");

  await db.application.update({
    where: { id: applicationId },
    data: { status: "WITHDRAWN" },
  });
  await audit(user.id, "APPLICATION_WITHDRAW", "Application", applicationId);
  revalidatePath(`/projects/${app.project.slug}`);
  revalidatePath("/dashboard");
}

export async function decideApplicationAction(formData: FormData) {
  const applicationId = String(formData.get("applicationId"));
  const decision = String(formData.get("decision"));
  if (!oneOf(["ACCEPTED", "DECLINED", "UNDER_REVIEW"], decision)) {
    throw new Error("Invalid decision.");
  }
  const note = String(formData.get("note") || "").trim();

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: { select: { id: true, slug: true, title: true, leadId: true } },
      user: { select: { id: true, name: true } },
      opening: { select: { role: true, pod: true } },
    },
  });
  if (!app) throw new Error("Application not found");

  const { user } = await assertManage(app.project.id);

  await db.application.update({
    where: { id: applicationId },
    data: {
      status: decision,
      decidedById: user.id,
      decidedAt: decision === "UNDER_REVIEW" ? null : new Date(),
      decisionNote: note || null,
    },
  });

  if (decision === "ACCEPTED") {
    await db.projectMember.upsert({
      where: { projectId_userId: { projectId: app.project.id, userId: app.userId } },
      create: {
        projectId: app.project.id,
        userId: app.userId,
        projectRole: "CONTRIBUTOR",
        roleTitle: app.roleApplied,
        pod: app.opening?.pod ?? null,
      },
      update: { roleTitle: app.roleApplied },
    });

    await db.contribution.create({
      data: {
        userId: app.userId,
        projectId: app.project.id,
        text: `Joined ${app.project.title} as ${app.roleApplied}`,
        type: "ADMIN",
        occurredAt: new Date(),
      },
    });

    await notify(app.userId, {
      type: "APPLICATION_ACCEPTED",
      title: `You're on the team: ${app.project.title}`,
      body: note || "Welcome aboard. Check the announcements and discussion to get started.",
      link: `/projects/${app.project.slug}`,
    });
  } else if (decision === "DECLINED") {
    await notify(app.userId, {
      type: "APPLICATION_DECLINED",
      title: `Update on your application to ${app.project.title}`,
      body: note || "The lead has decided not to move forward this time. Other projects are recruiting.",
      link: `/projects/${app.project.slug}`,
    });
  }

  await audit(user.id, `APPLICATION_${decision}`, "Application", applicationId, app.user.name);
  revalidatePath(`/projects/${app.project.slug}`);
  revalidatePath("/admin");
}

/* ── Discussion ─────────────────────────────────────────── */

export async function postMessageAction(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const project = await loadProject(projectId);
  const access = await getProjectAccess(project.id, project.leadId, user);
  if (!access.canSeeInternal) throw new Error("FORBIDDEN");

  await db.message.create({ data: { projectId, authorId: user.id, body } });
  // The fact of posting is logged; the message content deliberately is not.
  await audit(user.id, "MESSAGE_POST", "Project", projectId, project.title);
  await notify(await projectAudience(projectId, user.id), {
    type: "MESSAGE",
    title: `New message in ${project.title}`,
    body: `${user.name}: ${body.slice(0, 120)}`,
    link: `/projects/${project.slug}?tab=discussion`,
  });
  revalidatePath(`/projects/${project.slug}`);
}

/* ── Announcements, meetings, resources ─────────────────── */

export async function postAnnouncementAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  const { user, project } = await assertManage(projectId);

  await db.announcement.create({ data: { projectId, authorId: user.id, body } });
  await audit(user.id, "ANNOUNCEMENT_POST", "Project", projectId, project.title);
  await notify(await projectAudience(projectId, user.id), {
    type: "ANNOUNCEMENT",
    title: `Announcement — ${project.title}`,
    body: body.slice(0, 140),
    link: `/projects/${project.slug}`,
  });
  revalidatePath(`/projects/${project.slug}`);
}

export async function addMeetingAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { user, project } = await assertManage(projectId);

  const title = String(formData.get("title") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const decisions = String(formData.get("decisions") || "").trim();
  const heldAtRaw = String(formData.get("heldAt") || "");
  const attendeesCount = Number(formData.get("attendeesCount") || 0);
  if (!title || !notes) return;

  await db.meeting.create({
    data: {
      projectId,
      title,
      notes,
      decisions,
      attendeesCount: Number.isFinite(attendeesCount) ? attendeesCount : 0,
      heldAt: heldAtRaw ? new Date(heldAtRaw) : new Date(),
      authorId: user.id,
    },
  });

  await db.contribution.create({
    data: {
      userId: user.id,
      projectId,
      text: `Wrote meeting notes: ${title}`,
      type: "NOTES",
      creditRole: "Project administration",
    },
  });

  await audit(user.id, "MEETING_ADD", "Project", projectId, title);
  await notify(await projectAudience(projectId, user.id), {
    type: "MEETING",
    title: `Meeting notes posted — ${project.title}`,
    body: title,
    link: `/projects/${project.slug}?tab=meetings`,
  });
  revalidatePath(`/projects/${project.slug}`);
}

export async function addResourceAction(formData: FormData) {
  const projectId = String(formData.get("projectId") || "") || null;
  const workshopId = String(formData.get("workshopId") || "") || null;
  const sessionId = String(formData.get("sessionId") || "") || null;
  const meetingId = String(formData.get("meetingId") || "") || null;

  const user = await requireUser();

  let slugPath = "/";
  if (projectId) {
    const { project } = await assertManage(projectId);
    slugPath = `/projects/${project.slug}`;
  } else if (workshopId) {
    const w = await db.workshop.findUnique({
      where: { id: workshopId },
      select: { slug: true, facilitatorId: true },
    });
    if (!w) throw new Error("Workshop not found");
    if (w.facilitatorId !== user.id && user.role !== "ADMIN") throw new Error("FORBIDDEN");
    slugPath = `/workshops/${w.slug}`;
  }

  // A session attachment must belong to the workshop being managed.
  if (sessionId) {
    const session = await db.workshopSession.findUnique({
      where: { id: sessionId },
      select: { workshopId: true },
    });
    if (!session || session.workshopId !== workshopId) throw new Error("FORBIDDEN");
  }
  // A meeting attachment must belong to the project being managed.
  if (meetingId) {
    const meeting = await db.meeting.findUnique({
      where: { id: meetingId },
      select: { projectId: true },
    });
    if (!meeting || meeting.projectId !== projectId) throw new Error("FORBIDDEN");
  }

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  const url = String(formData.get("url") || "").trim();
  const upload = formData.get("file");
  const stored = upload instanceof File ? await storeUpload(upload) : null;

  // A resource needs somewhere to point: an uploaded file or a link.
  if (!stored && !url) return;

  let kind = String(formData.get("kind") || "LINK");
  if (kind === "AUTO") kind = stored ? kindFromExt(stored.ext) : "LINK";
  if (!oneOf(RESOURCE_KINDS, kind)) kind = "LINK";

  const visibilityRaw = String(formData.get("visibility") || "MEMBERS");

  await db.resource.create({
    data: {
      title,
      kind,
      url: url || null,
      filePath: stored?.filePath ?? null,
      fileSize: stored?.fileSize ?? null,
      version: String(formData.get("version") || "v1"),
      description: String(formData.get("description") || "").trim() || null,
      visibility: oneOf(VISIBILITIES, visibilityRaw) ? visibilityRaw : "MEMBERS",
      projectId,
      workshopId,
      sessionId,
      meetingId,
      uploadedById: user.id,
    },
  });

  await audit(
    user.id,
    "RESOURCE_ADD",
    projectId ? "Project" : "Workshop",
    projectId ?? workshopId ?? "",
    title,
  );
  if (projectId) {
    await notify(await projectAudience(projectId, user.id), {
      type: "RESOURCE",
      title: "New resource added",
      body: title,
      link: `${slugPath}?tab=resources`,
    });
  }
  revalidatePath(slugPath);
}

export async function deleteResourceAction(formData: FormData) {
  const id = String(formData.get("resourceId"));
  const user = await requireUser();
  const res = await db.resource.findUnique({
    where: { id },
    include: {
      project: { select: { slug: true, leadId: true, id: true } },
      workshop: { select: { slug: true, facilitatorId: true } },
    },
  });
  if (!res) return;

  const allowed =
    user.role === "ADMIN" ||
    res.uploadedById === user.id ||
    res.project?.leadId === user.id ||
    res.workshop?.facilitatorId === user.id;
  if (!allowed) throw new Error("FORBIDDEN");

  await deleteObject(res.filePath);
  await db.resource.delete({ where: { id } });
  await audit(user.id, "RESOURCE_DELETE", "Resource", id, res.title);
  revalidatePath(res.project ? `/projects/${res.project.slug}` : `/workshops/${res.workshop?.slug}`);
}

/* ── Openings ───────────────────────────────────────────── */

export async function addOpeningAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { user, project } = await assertManage(projectId);
  const role = String(formData.get("role") || "").trim();
  if (!role) return;

  await db.opening.create({
    data: {
      projectId,
      role,
      skills: String(formData.get("skills") || "").trim(),
      commitment: String(formData.get("commitment") || "2–4 hours / week"),
      pod: String(formData.get("pod") || "").trim() || null,
      seats: Number(formData.get("seats") || 1) || 1,
    },
  });
  await audit(user.id, "OPENING_ADD", "Project", projectId, role);
  revalidatePath(`/projects/${project.slug}`);
}

export async function toggleOpeningAction(formData: FormData) {
  const openingId = String(formData.get("openingId"));
  const opening = await db.opening.findUnique({
    where: { id: openingId },
    include: { project: { select: { id: true, slug: true } } },
  });
  if (!opening) return;
  const { user } = await assertManage(opening.project.id);

  await db.opening.update({
    where: { id: openingId },
    data: { isOpen: !opening.isOpen },
  });
  await audit(
    user.id,
    opening.isOpen ? "OPENING_CLOSE" : "OPENING_REOPEN",
    "Opening",
    openingId,
    opening.role,
  );
  revalidatePath(`/projects/${opening.project.slug}`);
}

/* ── Tasks ──────────────────────────────────────────────── */

export async function createTaskAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const user = await requireUser();
  const project = await loadProject(projectId);
  const access = await getProjectAccess(project.id, project.leadId, user);

  // Any member may add a task. Credit assignment, good-first flags, and
  // assigning OTHER people are manager powers — a contributor can't mint
  // credit-bearing tasks for themselves.
  if (!access.isMember && !access.isAdmin) throw new Error("FORBIDDEN");
  const isManager = access.canManage;

  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const dueRaw = String(formData.get("dueDate") || "");
  const effortRaw = String(formData.get("effort") || "M");
  const creditRoleRaw = String(formData.get("creditRole") || "").trim();
  const assigneeRaw = String(formData.get("assigneeId") || "");

  await db.task.create({
    data: {
      projectId,
      title,
      description: String(formData.get("description") || "").trim(),
      pod: String(formData.get("pod") || "").trim() || null,
      effort: oneOf(TASK_EFFORTS, effortRaw) ? effortRaw : "M",
      creditRole: isManager && oneOf(CREDIT_ROLES, creditRoleRaw) ? creditRoleRaw : null,
      goodFirstTask: isManager && formData.get("goodFirstTask") === "on",
      assigneeId: isManager
        ? assigneeRaw || null
        : formData.get("assignSelf") === "on"
          ? user.id
          : null,
      dueDate: dueRaw ? new Date(dueRaw) : null,
      createdById: user.id,
    },
  });
  await audit(user.id, "TASK_CREATE", "Project", projectId, title);
  revalidatePath(`/projects/${project.slug}`);
}

export async function deleteTaskAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId"));
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, slug: true, leadId: true } } },
  });
  if (!task) return;

  const access = await getProjectAccess(task.project.id, task.project.leadId, user);
  // Managers delete anything; a member may delete a task they created, unless
  // it's DONE — completed tasks are part of the credit record.
  const allowed =
    access.canManage || (task.createdById === user.id && task.status !== "DONE");
  if (!allowed) throw new Error("FORBIDDEN");

  await db.task.delete({ where: { id: taskId } });
  await audit(user.id, "TASK_DELETE", "Project", task.project.id, task.title);
  revalidatePath(`/projects/${task.project.slug}`);
}

export async function updateTaskStatusAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId"));
  const status = String(formData.get("status"));
  if (!oneOf(TASK_STATUSES, status)) throw new Error("Invalid status.");

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, slug: true, leadId: true, title: true } } },
  });
  if (!task) return;

  const access = await getProjectAccess(task.project.id, task.project.leadId, user);
  // The assignee or creator may move their own task; managers may move anything.
  const involved = task.assigneeId === user.id || task.createdById === user.id;
  if (!access.canManage && !involved) throw new Error("FORBIDDEN");
  // DONE writes to the credit ledger, so it's a manager's confirmation —
  // contributors hand work over via IN_REVIEW instead of self-certifying.
  if (!access.canManage && status === "DONE") {
    throw new Error("Move the task to In review — a lead or maintainer confirms it as done.");
  }

  await db.task.update({
    where: { id: taskId },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });
  await audit(user.id, "TASK_STATUS", "Task", taskId, `${task.title} → ${status}`);

  // Completing a task writes to the contribution ledger — this is how credit accrues.
  if (status === "DONE" && task.status !== "DONE" && task.assigneeId) {
    await db.contribution.create({
      data: {
        userId: task.assigneeId,
        projectId: task.project.id,
        text: task.title,
        type: task.creditRole?.startsWith("Writing")
          ? "WRITING"
          : task.creditRole === "Software"
            ? "CODE"
            : task.creditRole === "Formal analysis"
              ? "ANALYSIS"
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

  revalidatePath(`/projects/${task.project.slug}`);
}

export async function claimTaskAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId"));
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, slug: true, leadId: true } } },
  });
  if (!task) return;

  const access = await getProjectAccess(task.project.id, task.project.leadId, user);
  if (!access.isMember) throw new Error("Only project members can claim tasks.");
  // You can claim an unassigned task or release your own — never take someone else's.
  if (task.assigneeId && task.assigneeId !== user.id) {
    throw new Error("This task is already assigned. A lead or maintainer can reassign it.");
  }
  if (task.status === "DONE") throw new Error("This task is already done.");

  const releasing = task.assigneeId === user.id;
  await db.task.update({
    where: { id: taskId },
    data: {
      assigneeId: releasing ? null : user.id,
      status: releasing ? "OPEN" : "IN_PROGRESS",
    },
  });
  await audit(user.id, releasing ? "TASK_RELEASE" : "TASK_CLAIM", "Task", taskId, task.title);
  revalidatePath(`/projects/${task.project.slug}`);
}

/* ── Team & credit ──────────────────────────────────────── */

export async function updateMemberAction(formData: FormData) {
  const memberId = String(formData.get("memberId"));
  const member = await db.projectMember.findUnique({
    where: { id: memberId },
    include: { project: { select: { id: true, slug: true, leadId: true } } },
  });
  if (!member) return;
  const { user } = await assertManage(member.project.id);

  const projectRoleRaw = String(formData.get("projectRole") || member.projectRole);
  if (!oneOf(PROJECT_ROLES, projectRoleRaw)) throw new Error("Invalid project role.");
  // The lead's membership row stays LEAD — the leadId on the project is the
  // source of truth and a maintainer must not be able to demote the lead.
  const projectRole =
    member.userId === member.project.leadId ? "LEAD" : projectRoleRaw;

  const creditRoles = formData
    .getAll("creditRoles")
    .map(String)
    .filter((r) => oneOf(CREDIT_ROLES, r));
  const authorOrderRaw = String(formData.get("authorOrder") || "");
  const authorOrder = Math.trunc(Number(authorOrderRaw));

  await db.projectMember.update({
    where: { id: memberId },
    data: {
      projectRole,
      roleTitle: String(formData.get("roleTitle") || "").trim() || null,
      pod: String(formData.get("pod") || "").trim() || null,
      creditRoles: JSON.stringify(creditRoles),
      authorOrder: authorOrderRaw && authorOrder >= 1 ? authorOrder : null,
    },
  });
  await audit(user.id, "MEMBER_UPDATE", "ProjectMember", memberId, projectRole);
  revalidatePath(`/projects/${member.project.slug}`);
}

export async function removeMemberAction(formData: FormData) {
  const memberId = String(formData.get("memberId"));
  const member = await db.projectMember.findUnique({
    where: { id: memberId },
    include: { project: { select: { id: true, slug: true, leadId: true } } },
  });
  if (!member) return;
  const { user } = await assertManage(member.project.id);
  if (member.userId === member.project.leadId) throw new Error("Cannot remove the project lead.");

  await db.projectMember.delete({ where: { id: memberId } });
  await audit(user.id, "MEMBER_REMOVE", "Project", member.project.id, member.userId);
  revalidatePath(`/projects/${member.project.slug}`);
}

/* ── Outputs ────────────────────────────────────────────── */

export async function addOutputAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { user, project } = await assertManage(projectId);

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  // The author line is generated from the credit ledger, in author order.
  const members = await db.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { name: true } } },
    orderBy: [{ authorOrder: "asc" }, { joinedAt: "asc" }],
  });
  const authorsLine = members
    .filter((m) => JSON.parse(m.creditRoles || "[]").length > 0)
    .map((m) => m.user.name)
    .join(", ");

  const publishedRaw = String(formData.get("publishedAt") || "");
  const typeRaw = String(formData.get("type") || "PREPRINT");
  const statusRaw = String(formData.get("status") || "DRAFT");
  const licenseRaw = String(formData.get("license") || "CC-BY-4.0");

  // Archived copy — /publications shouldn't depend on external hosts surviving.
  const upload = formData.get("file");
  const stored = upload instanceof File ? await storeUpload(upload) : null;

  await db.output.create({
    data: {
      projectId,
      title,
      filePath: stored?.filePath ?? null,
      fileSize: stored?.fileSize ?? null,
      type: oneOf(OUTPUT_TYPES, typeRaw) ? typeRaw : "PREPRINT",
      url: String(formData.get("url") || "").trim() || null,
      doi: String(formData.get("doi") || "").trim() || null,
      license: oneOf(LICENSES, licenseRaw) ? licenseRaw : "CC-BY-4.0",
      venue: String(formData.get("venue") || "").trim() || null,
      status: oneOf(OUTPUT_STATUSES, statusRaw) ? statusRaw : "DRAFT",
      authorsLine,
      publishedAt: publishedRaw ? new Date(publishedRaw) : null,
    },
  });

  await audit(user.id, "OUTPUT_ADD", "Project", projectId, title);
  await notify(await projectAudience(projectId, user.id), {
    type: "OUTPUT",
    title: `New output on ${project.title}`,
    body: title,
    link: `/projects/${project.slug}?tab=outputs`,
  });
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/publications");
}

export async function logContributionAction(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  const { user, project } = await assertManage(projectId);

  const userId = String(formData.get("userId"));
  const text = String(formData.get("text") || "").trim();
  if (!userId || !text) return;

  // A contribution can only be logged for someone actually on the project.
  const target = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!target && userId !== project.leadId) {
    throw new Error("Contributions can only be logged for project members.");
  }

  const typeRaw = String(formData.get("type") || "DATA");
  const creditRoleRaw = String(formData.get("creditRole") || "").trim();

  await db.contribution.create({
    data: {
      userId,
      projectId,
      text,
      type: oneOf(CONTRIBUTION_TYPES, typeRaw) ? typeRaw : "DATA",
      creditRole: oneOf(CREDIT_ROLES, creditRoleRaw) ? creditRoleRaw : null,
    },
  });

  await audit(user.id, "CONTRIBUTION_LOG", "User", userId, text.slice(0, 80));
  await notify(userId, {
    type: "CONTRIBUTION",
    title: "A contribution was logged for you",
    body: `${text} — ${project.title}`,
    link: "/profile",
  });
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/profile");
}

/* ── Bookmarks ──────────────────────────────────────────── */

export async function toggleBookmarkAction(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") || "") || null;
  const workshopId = String(formData.get("workshopId") || "") || null;
  const path = String(formData.get("path") || "/");

  const existing = await db.bookmark.findFirst({
    where: { userId: user.id, projectId, workshopId },
  });
  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } });
  } else {
    await db.bookmark.create({ data: { userId: user.id, projectId, workshopId } });
  }
  await audit(
    user.id,
    existing ? "BOOKMARK_REMOVE" : "BOOKMARK_ADD",
    projectId ? "Project" : "Workshop",
    projectId ?? workshopId ?? "",
  );
  revalidatePath(path);
  revalidatePath("/dashboard");
}
