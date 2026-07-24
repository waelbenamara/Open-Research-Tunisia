import "server-only";
import { db } from "./db";
import type { SessionUser } from "./auth";

/**
 * Can this user read this resource?
 *
 * PUBLIC  — anyone, signed in or not
 * MEMBERS — any signed-in, non-suspended member of the initiative
 * TEAM    — only the project team (or workshop enrollees), plus the lead/facilitator
 *           and admins
 */
export async function canAccessResource(
  resource: {
    visibility: string;
    projectId: string | null;
    workshopId: string | null;
    uploadedById: string;
  },
  user: SessionUser | null,
): Promise<boolean> {
  if (resource.visibility === "PUBLIC") return true;
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (resource.visibility === "MEMBERS") return true;

  // TEAM from here on.
  if (resource.uploadedById === user.id) return true;

  if (resource.projectId) {
    const project = await db.project.findUnique({
      where: { id: resource.projectId },
      select: { leadId: true },
    });
    if (project?.leadId === user.id) return true;

    const membership = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: resource.projectId, userId: user.id } },
      select: { id: true },
    });
    return !!membership;
  }

  if (resource.workshopId) {
    const workshop = await db.workshop.findUnique({
      where: { id: resource.workshopId },
      select: { facilitatorId: true },
    });
    if (workshop?.facilitatorId === user.id) return true;

    const enrollment = await db.enrollment.findUnique({
      where: { workshopId_userId: { workshopId: resource.workshopId, userId: user.id } },
      select: { status: true },
    });
    return !!enrollment && enrollment.status !== "DROPPED";
  }

  return false;
}
