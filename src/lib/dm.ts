import "server-only";
import { db } from "./db";
import { notify } from "./notify";
import { sendEmail } from "./email";
import { renderEmailHtml, renderEmailText, type EmailTemplate } from "./emailTemplates";
import { storeDedupedFile } from "./files";
import { UPLOAD_MAX_BYTES, extAllowed } from "./storage";
import { fileExt } from "./format";

const MAX_LEN = 4000;
const MAX_FILES = 10;

export type SentAttachment = { id: string; filename: string; ext: string; size: number };
export type SentMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  attachments: SentAttachment[];
};

/**
 * Create a direct message — text, files, or both — shared by the server action
 * and the XHR upload route. Files are deduplicated by content hash. Returns the
 * serialized message, or `{ error }` for a user-facing problem, or null for an
 * empty send.
 */
export async function createDirectMessage(
  me: { id: string; name: string },
  opts: { recipientId: string; body: string; files: File[]; origin: string },
): Promise<SentMessage | { error: string } | null> {
  const body = opts.body.trim();
  const files = opts.files.filter((f) => f instanceof File && f.size > 0).slice(0, MAX_FILES);
  if (!body && files.length === 0) return null;
  if (opts.recipientId === me.id) return { error: "You can't message yourself." };

  // Validate all files up front so we never create a message we can't complete.
  for (const f of files) {
    const ext = fileExt(f.name);
    if (!extAllowed(ext)) return { error: `Files of type .${ext || "?"} aren't accepted.` };
    if (f.size > UPLOAD_MAX_BYTES) return { error: `“${f.name}” is larger than 25 MB.` };
  }

  const recipient = await db.user.findUnique({
    where: { id: opts.recipientId },
    select: { id: true, name: true, email: true, suspended: true, emailUpdates: true },
  });
  if (!recipient || recipient.suspended) return { error: "That person can't receive messages." };

  const priorFromMe = await db.directMessage.findFirst({
    where: { senderId: me.id, recipientId: opts.recipientId },
    select: { id: true },
  });

  const created = await db.directMessage.create({
    data: { senderId: me.id, recipientId: opts.recipientId, body: body.slice(0, MAX_LEN) },
    select: { id: true, createdAt: true },
  });

  const attachments: SentAttachment[] = [];
  for (const f of files) {
    const blob = await storeDedupedFile(f);
    if (!blob) continue;
    const att = await db.messageAttachment.create({
      data: { messageId: created.id, blobHash: blob.hash, filename: blob.filename },
      include: { blob: { select: { ext: true, size: true } } },
    });
    attachments.push({ id: att.id, filename: att.filename, ext: att.blob.ext, size: att.blob.size });
  }

  const notifyBody =
    body.slice(0, 120) ||
    (attachments.length === 1
      ? `Sent a file: ${attachments[0].filename}`
      : `Sent ${attachments.length} files`);
  await notify(opts.recipientId, {
    type: "MESSAGE_DIRECT",
    title: `New message from ${me.name}`,
    body: notifyBody,
    link: `/messages/${me.id}`,
  });

  // First message from someone new → one email (gated by the recipient's pref).
  if (!priorFromMe && recipient.emailUpdates) {
    const template: EmailTemplate = {
      preheader: `${me.name} started a conversation with you.`,
      heading: `${me.name} sent you a message`,
      greeting: `Hi ${recipient.name.split(" ")[0]},`,
      paragraphs: [
        `${me.name} just started a conversation with you on Open Research Tunisia:`,
        body
          ? `“${body.slice(0, 280)}${body.length > 280 ? "…" : ""}”`
          : `Shared ${attachments.length} file${attachments.length === 1 ? "" : "s"} with you.`,
        "Reply from the platform — you won't get an email for every message, only when someone new reaches out.",
      ],
      cta: { label: "Read & reply", url: `${opts.origin}/messages/${me.id}` },
      footerNote: `Sent to ${recipient.email} because ${me.name} messaged you. Manage email preferences in your profile.`,
    };
    await sendEmail({
      to: recipient.email,
      subject: `${me.name} sent you a message — Open Research Tunisia`,
      text: renderEmailText(template),
      html: renderEmailHtml(template),
    });
  }

  return {
    id: created.id,
    body: body.slice(0, MAX_LEN),
    senderId: me.id,
    createdAt: created.createdAt.toISOString(),
    attachments,
  };
}
