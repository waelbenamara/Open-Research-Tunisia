import "server-only";
import { db } from "./db";

export type ReactionSummary = { counts: Record<string, number>; myReaction: string | null };

/** Load reaction counts + the viewer's own reaction for a batch of targets. */
export async function loadReactions(
  targetType: string,
  targetIds: string[],
  meId: string,
): Promise<Map<string, ReactionSummary>> {
  const map = new Map<string, ReactionSummary>();
  for (const id of targetIds) map.set(id, { counts: {}, myReaction: null });
  if (targetIds.length === 0) return map;

  const rows = await db.reaction.findMany({
    where: { targetType, targetId: { in: targetIds } },
    select: { targetId: true, kind: true, userId: true },
  });
  for (const r of rows) {
    const s = map.get(r.targetId);
    if (!s) continue;
    s.counts[r.kind] = (s.counts[r.kind] ?? 0) + 1;
    if (r.userId === meId) s.myReaction = r.kind;
  }
  return map;
}
