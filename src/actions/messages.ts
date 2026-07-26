"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createDirectMessage } from "@/lib/dm";

async function requestOrigin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}

/**
 * Send a text message (the composer uses the XHR route for file uploads so it
 * can show progress). Returns the created message so the live thread can
 * replace its optimistic bubble instead of duplicating it.
 */
export async function sendDirectMessageAction(formData: FormData) {
  const me = await requireUser();
  const result = await createDirectMessage(me, {
    recipientId: String(formData.get("recipientId") || ""),
    body: String(formData.get("body") || ""),
    files: [],
    origin: await requestOrigin(),
  });
  if (!result || "error" in result) return result ?? undefined;
  revalidatePath("/messages");
  return result;
}

/** Mark a conversation read: the messages from `otherId`, and the in-app
 *  "new message" notifications they generated (so the Inbox badge clears too). */
export async function markThreadReadAction(otherId: string) {
  const me = await requireUser();
  await db.directMessage.updateMany({
    where: { senderId: otherId, recipientId: me.id, readAt: null },
    data: { readAt: new Date() },
  });
  await db.notification.updateMany({
    where: {
      userId: me.id,
      type: "MESSAGE_DIRECT",
      link: `/messages/${otherId}`,
      read: false,
    },
    data: { read: true },
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
