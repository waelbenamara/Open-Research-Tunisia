"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit, notify } from "@/lib/notify";

export async function decidePostingRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = String(formData.get("requestId"));
  const decision = String(formData.get("decision")); // APPROVED | DENIED
  const note = String(formData.get("note") || "").trim();

  const request = await db.postingRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!request) return;

  await db.postingRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      decidedById: admin.id,
      decidedAt: new Date(),
      decisionNote: note || null,
    },
  });

  if (decision === "APPROVED") {
    await db.user.update({
      where: { id: request.userId },
      data: { canPostProjects: true, role: "LEAD" },
    });
    await notify(request.userId, {
      type: "POSTING_APPROVED",
      title: "You can now post projects",
      body:
        note ||
        "Your request was approved. Head to “Post a project” to publish your first one — describe the open roles carefully, that's what attracts good contributors.",
      link: "/projects/new",
    });
  } else {
    await notify(request.userId, {
      type: "POSTING_DENIED",
      title: "Posting-rights request declined",
      body: note || "An admin reviewed your request and declined it for now.",
      link: "/request-posting-rights",
    });
  }

  await audit(admin.id, `POSTING_${decision}`, "PostingRequest", requestId, request.user.name);
  revalidatePath("/admin");
}

export async function setUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role"));
  if (userId === admin.id) throw new Error("You cannot change your own role.");

  await db.user.update({
    where: { id: userId },
    data: { role, canPostProjects: role === "LEAD" || role === "ADMIN" },
  });
  await audit(admin.id, "USER_ROLE", "User", userId, role);
  revalidatePath("/admin");
}

export async function toggleSuspendAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  if (userId === admin.id) throw new Error("You cannot suspend yourself.");

  const user = await db.user.findUnique({ where: { id: userId }, select: { suspended: true } });
  if (!user) return;

  await db.user.update({ where: { id: userId }, data: { suspended: !user.suspended } });
  // Suspending kills every live session for that account.
  if (!user.suspended) await db.session.deleteMany({ where: { userId } });

  await audit(admin.id, user.suspended ? "USER_UNSUSPEND" : "USER_SUSPEND", "User", userId);
  revalidatePath("/admin");
}

export async function postGlobalAnnouncementAction(formData: FormData) {
  const admin = await requireAdmin();
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await db.announcement.create({ data: { body, isGlobal: true, authorId: admin.id } });

  const users = await db.user.findMany({ where: { suspended: false }, select: { id: true } });
  await notify(
    users.map((u) => u.id),
    { type: "GLOBAL", title: "Announcement from Open Research Tunisia", body, link: "/" },
  );

  await audit(admin.id, "GLOBAL_ANNOUNCEMENT", "Announcement", "", body.slice(0, 80));
  revalidatePath("/admin");
  revalidatePath("/");
}

/** Approve or reject a submitted project. Rejection keeps it visible to its
 *  lead with the note; editing it resubmits automatically. */
export async function decideProjectApprovalAction(formData: FormData) {
  const admin = await requireAdmin();
  const projectId = String(formData.get("projectId"));
  const decision = String(formData.get("decision")); // APPROVED | REJECTED
  if (decision !== "APPROVED" && decision !== "REJECTED") throw new Error("Invalid decision.");
  const note = String(formData.get("note") || "").trim();

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, slug: true, title: true, leadId: true, approvalStatus: true },
  });
  if (!project || project.approvalStatus === decision) return;

  await db.project.update({
    where: { id: projectId },
    data: { approvalStatus: decision, approvalNote: note || null },
  });

  await notify(project.leadId, {
    type: decision === "APPROVED" ? "PROJECT_APPROVED" : "PROJECT_REJECTED",
    title:
      decision === "APPROVED"
        ? `Your project is live: ${project.title}`
        : `Changes requested: ${project.title}`,
    body:
      note ||
      (decision === "APPROVED"
        ? "An admin approved your project — it's now visible on Discover and open for applications."
        : "An admin reviewed your project and requested changes. Edit the project to resubmit it."),
    link: `/projects/${project.slug}`,
  });

  await audit(admin.id, `PROJECT_${decision}`, "Project", projectId, project.title);
  revalidatePath("/admin");
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/");
}

export async function archiveProjectAction(formData: FormData) {
  const admin = await requireAdmin();
  const projectId = String(formData.get("projectId"));
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { archived: true, slug: true },
  });
  if (!project) return;

  await db.project.update({
    where: { id: projectId },
    data: { archived: !project.archived, stage: !project.archived ? "Archived" : "Active" },
  });
  await audit(admin.id, project.archived ? "PROJECT_UNARCHIVE" : "PROJECT_ARCHIVE", "Project", projectId);
  revalidatePath("/admin");
  revalidatePath(`/projects/${project.slug}`);
}

export async function markAllNotificationsReadAction() {
  const { requireUser } = await import("@/lib/auth");
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(formData: FormData) {
  const { requireUser } = await import("@/lib/auth");
  const user = await requireUser();
  const id = String(formData.get("notificationId"));
  await db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
