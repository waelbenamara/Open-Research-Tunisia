"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

const MAX_LEN = 4000;

/**
 * Send a private message to another member. Any signed-in, non-suspended member
 * may message any other member. Returns nothing on success (the thread page
 * revalidates); throws on a real problem.
 */
export async function sendDirectMessageAction(formData: FormData) {
  const me = await requireUser();
  const recipientId = String(formData.get("recipientId") || "");
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  if (recipientId === me.id) throw new Error("You can't message yourself.");

  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { id: true, name: true, suspended: true },
  });
  if (!recipient || recipient.suspended) throw new Error("That person can't receive messages.");

  await db.directMessage.create({
    data: { senderId: me.id, recipientId, body: body.slice(0, MAX_LEN) },
  });

  await notify(recipientId, {
    type: "MESSAGE_DIRECT",
    title: `New message from ${me.name}`,
    body: body.slice(0, 120),
    link: `/messages/${me.id}`,
  });

  revalidatePath(`/messages/${recipientId}`);
  revalidatePath("/messages");
}

/** Mark every message from `otherId` to me as read. */
export async function markThreadReadAction(otherId: string) {
  const me = await requireUser();
  await db.directMessage.updateMany({
    where: { senderId: otherId, recipientId: me.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/messages");
  revalidatePath("/", "layout");
}

/** Start (or open) a conversation with someone — used by the "Message" button. */
export async function openConversationAction(formData: FormData) {
  await requireUser();
  const otherId = String(formData.get("userId") || "");
  redirect(`/messages/${otherId}`);
}
