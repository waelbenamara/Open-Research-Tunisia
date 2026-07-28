"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { REACTION_KINDS } from "@/lib/reactions";

/** Where a reaction lives, so we can revalidate the right page and find the author. */
async function targetContext(targetType: string, targetId: string) {
  if (targetType === "post_comment") {
    const c = await db.postComment.findUnique({
      where: { id: targetId },
      select: { authorId: true, postId: true },
    });
    if (!c) return null;
    return { authorId: c.authorId, path: "/feed", link: `/feed#post-${c.postId}` };
  }
  if (targetType === "message") {
    const m = await db.message.findUnique({
      where: { id: targetId },
      select: {
        authorId: true,
        project: { select: { slug: true } },
        workshop: { select: { slug: true } },
      },
    });
    if (!m) return null;
    if (m.workshop) {
      const base = `/workshops/${m.workshop.slug}`;
      return { authorId: m.authorId, path: base, link: `${base}?tab=discussion` };
    }
    if (m.project) {
      const base = `/projects/${m.project.slug}`;
      return { authorId: m.authorId, path: base, link: `${base}?tab=discussion` };
    }
    return null;
  }
  return null;
}

/** Set, change, or clear the current user's reaction to any target (one per target). */
export async function toggleReactionAction(formData: FormData) {
  const user = await requireUser();
  const targetType = String(formData.get("targetType") || "");
  const targetId = String(formData.get("targetId") || "");
  const kind = String(formData.get("kind") || "like");
  if (!targetId || !REACTION_KINDS.includes(kind)) return;

  const ctx = await targetContext(targetType, targetId);
  if (!ctx) return;

  const existing = await db.reaction.findUnique({
    where: { targetType_targetId_userId: { targetType, targetId, userId: user.id } },
  });

  if (existing) {
    if (existing.kind === kind) {
      await db.reaction.delete({ where: { id: existing.id } });
    } else {
      await db.reaction.update({ where: { id: existing.id }, data: { kind } });
    }
  } else {
    await db.reaction.create({ data: { targetType, targetId, userId: user.id, kind } });
    if (ctx.authorId !== user.id) {
      await notify(ctx.authorId, {
        type: "REACTION",
        title: `${user.name} reacted to your ${targetType === "message" ? "message" : "comment"}`,
        body: "",
        link: ctx.link,
      });
    }
  }
  revalidatePath(ctx.path);
}
