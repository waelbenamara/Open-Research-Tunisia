import "server-only";
import { db } from "./db";

export async function notify(
  userIds: string | string[],
  n: { type: string; title: string; body?: string; link?: string },
) {
  const ids = Array.isArray(userIds) ? [...new Set(userIds)] : [userIds];
  if (ids.length === 0) return;
  await db.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: n.type,
      title: n.title,
      body: n.body ?? "",
      link: n.link ?? null,
    })),
  });
}

export async function audit(
  actorId: string | null,
  action: string,
  targetType = "",
  targetId = "",
  meta = "",
) {
  await db.auditLog.create({ data: { actorId, action, targetType, targetId, meta } });
}

/** Everyone who should hear about activity inside a project. */
export async function projectAudience(projectId: string, exclude?: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { leadId: true, members: { select: { userId: true } } },
  });
  if (!project) return [];
  const ids = [project.leadId, ...project.members.map((m) => m.userId)];
  return ids.filter((id) => id !== exclude);
}
