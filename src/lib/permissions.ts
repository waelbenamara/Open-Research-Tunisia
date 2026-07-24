import "server-only";
import { db } from "./db";
import type { SessionUser } from "./auth";

export type ProjectAccess = {
  isAdmin: boolean;
  isLead: boolean;
  isMaintainer: boolean;
  isMember: boolean;
  /** Can edit the project, post announcements, manage resources & tasks. */
  canManage: boolean;
  /** Can see TEAM-visibility resources, discussion, meeting notes, tasks. */
  canSeeInternal: boolean;
  /** Can accept/decline applications. */
  canReview: boolean;
  projectRole: string | null;
};

export const NO_ACCESS: ProjectAccess = {
  isAdmin: false,
  isLead: false,
  isMaintainer: false,
  isMember: false,
  canManage: false,
  canSeeInternal: false,
  canReview: false,
  projectRole: null,
};

export async function getProjectAccess(
  projectId: string,
  leadId: string,
  user: SessionUser | null,
): Promise<ProjectAccess> {
  if (!user) return NO_ACCESS;

  const isAdmin = user.role === "ADMIN";
  const isLead = leadId === user.id;

  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });

  const isMaintainer = membership?.projectRole === "MAINTAINER";
  const isMember = !!membership || isLead;
  const canManage = isAdmin || isLead || isMaintainer;

  return {
    isAdmin,
    isLead,
    isMaintainer,
    isMember,
    canManage,
    canSeeInternal: canManage || isMember,
    canReview: canManage,
    projectRole: membership?.projectRole ?? (isLead ? "LEAD" : null),
  };
}

export async function canManageWorkshop(
  facilitatorId: string,
  user: SessionUser | null,
): Promise<boolean> {
  if (!user) return false;
  return user.role === "ADMIN" || user.id === facilitatorId;
}

/** Anyone with posting rights, plus admins. */
export function canCreateProject(user: SessionUser | null) {
  return !!user && (user.role === "ADMIN" || user.canPostProjects);
}
