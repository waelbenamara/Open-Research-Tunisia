"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit, notify } from "@/lib/notify";
import { storeDedupedFile } from "@/lib/files";
import { REACTION_KINDS } from "@/lib/reactions";

const MAX_IMAGES = 6;
const MAX_BODY = 5000;
const MAX_COMMENT = 2000;

/** Create a feed post: markdown body, up to 6 photos, and an optional link to a
 *  project or workshop. Photos are content-addressed (deduplicated). */
export async function createPostAction(formData: FormData) {
  const user = await requireUser();

  const body = String(formData.get("body") || "").trim().slice(0, MAX_BODY);
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_IMAGES);
  const linkedProjectId = String(formData.get("linkedProjectId") || "") || null;
  const linkedWorkshopId = String(formData.get("linkedWorkshopId") || "") || null;

  if (!body && files.length === 0) return;

  // Only link things that actually exist.
  const project = linkedProjectId
    ? await db.project.findUnique({ where: { id: linkedProjectId }, select: { id: true } })
    : null;
  const workshop = linkedWorkshopId
    ? await db.workshop.findUnique({ where: { id: linkedWorkshopId }, select: { id: true } })
    : null;

  const post = await db.post.create({
    data: {
      authorId: user.id,
      body,
      linkedProjectId: project?.id ?? null,
      linkedWorkshopId: workshop?.id ?? null,
    },
  });

  let order = 0;
  for (const file of files) {
    try {
      const stored = await storeDedupedFile(file);
      if (stored) {
        await db.postImage.create({
          data: { postId: post.id, blobHash: stored.hash, order: order++ },
        });
      }
    } catch {
      /* skip an image that's too big or a disallowed type */
    }
  }

  await audit(user.id, "POST_CREATE", "Post", post.id, body.slice(0, 60));
  revalidatePath("/feed");
}

export async function deletePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post) return;
  if (post.authorId !== user.id && user.role !== "ADMIN") throw new Error("FORBIDDEN");

  // Cascades images/comments/reactions. Shared blobs are left intact (dedup).
  await db.post.delete({ where: { id: postId } });
  await audit(user.id, "POST_DELETE", "Post", postId);
  revalidatePath("/feed");
}

export async function addCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  const body = String(formData.get("body") || "").trim().slice(0, MAX_COMMENT);
  if (!body) return;

  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true } });
  if (!post) return;

  await db.postComment.create({ data: { postId, authorId: user.id, body } });
  await audit(user.id, "POST_COMMENT", "Post", postId, body.slice(0, 60));

  if (post.authorId !== user.id) {
    await notify(post.authorId, {
      type: "POST_COMMENT",
      title: `${user.name} commented on your post`,
      body: body.slice(0, 120),
      link: `/feed#post-${postId}`,
    });
  }
  revalidatePath("/feed");
}

export async function deleteCommentAction(formData: FormData) {
  const user = await requireUser();
  const commentId = String(formData.get("commentId"));
  const comment = await db.postComment.findUnique({
    where: { id: commentId },
    select: { authorId: true, post: { select: { authorId: true } } },
  });
  if (!comment) return;

  // The comment's author, the post's author, or an admin may remove it.
  const allowed =
    comment.authorId === user.id || comment.post.authorId === user.id || user.role === "ADMIN";
  if (!allowed) throw new Error("FORBIDDEN");

  await db.postComment.delete({ where: { id: commentId } });
  revalidatePath("/feed");
}

/** Set, change, or clear the current user's reaction to a post (one per post). */
export async function toggleReactionAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  const kind = String(formData.get("kind") || "like");
  if (!REACTION_KINDS.includes(kind)) return;

  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true } });
  if (!post) return;

  const existing = await db.postReaction.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
  });

  if (existing) {
    if (existing.kind === kind) {
      await db.postReaction.delete({ where: { id: existing.id } });
    } else {
      await db.postReaction.update({ where: { id: existing.id }, data: { kind } });
    }
  } else {
    await db.postReaction.create({ data: { postId, userId: user.id, kind } });
    if (post.authorId !== user.id) {
      await notify(post.authorId, {
        type: "POST_REACTION",
        title: `${user.name} reacted to your post`,
        body: "",
        link: `/feed#post-${postId}`,
      });
    }
  }
  revalidatePath("/feed");
}
