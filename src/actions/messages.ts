"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { renderEmailHtml, renderEmailText, type EmailTemplate } from "@/lib/emailTemplates";

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
    select: { id: true, name: true, email: true, suspended: true, emailUpdates: true },
  });
  if (!recipient || recipient.suspended) throw new Error("That person can't receive messages.");

  // Is this the first message this recipient has ever had from me? If so it's a
  // new conversation — worth an email. Replies stay in-app only.
  const priorFromMe = await db.directMessage.findFirst({
    where: { senderId: me.id, recipientId },
    select: { id: true },
  });

  await db.directMessage.create({
    data: { senderId: me.id, recipientId, body: body.slice(0, MAX_LEN) },
  });

  await notify(recipientId, {
    type: "MESSAGE_DIRECT",
    title: `New message from ${me.name}`,
    body: body.slice(0, 120),
    link: `/messages/${me.id}`,
  });

  if (!priorFromMe && recipient.emailUpdates) {
    const h = await headers();
    const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
    const template: EmailTemplate = {
      preheader: `${me.name} started a conversation with you.`,
      heading: `${me.name} sent you a message`,
      greeting: `Hi ${recipient.name.split(" ")[0]},`,
      paragraphs: [
        `${me.name} just started a conversation with you on Open Research Tunisia:`,
        `“${body.slice(0, 280)}${body.length > 280 ? "…" : ""}”`,
        "Reply from the platform — you won't get an email for every message, only when someone new reaches out.",
      ],
      cta: { label: "Read & reply", url: `${origin}/messages/${me.id}` },
      footerNote: `Sent to ${recipient.email} because ${me.name} messaged you. Manage email preferences in your profile.`,
    };
    await sendEmail({
      to: recipient.email,
      subject: `${me.name} sent you a message — Open Research Tunisia`,
      text: renderEmailText(template),
      html: renderEmailHtml(template),
    });
  }

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
