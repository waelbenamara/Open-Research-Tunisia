import "server-only";
import { db } from "./db";
import { sendEmail } from "./email";
import { renderEmailHtml, renderEmailText, type EmailTemplate } from "./emailTemplates";

/**
 * Periodic activity digest.
 *
 * The cron runs daily, but each person is emailed at most once every
 * DIGEST_MIN_HOURS and only when they have unread notifications since their
 * last digest — so an engaged user who reads everything gets nothing, and
 * nobody is emailed per-event.
 */
const DIGEST_MIN_HOURS = 47; // ~2 days, tolerant of a daily cron's timing jitter
const MAX_ITEMS = 12;
const MAX_USERS_PER_RUN = 300;

/** Human label per notification type — falls back to the stored title. */
function typeLabel(type: string): string | null {
  const map: Record<string, string> = {
    APPLICATION: "New application",
    APPLICATION_ACCEPTED: "Application accepted",
    APPLICATION_DECLINED: "Application update",
    TASK_ASSIGNED: "Task assigned",
    TASK_REVIEW: "Task ready for review",
    TASK_DONE: "Task confirmed",
    MESSAGE_DIRECT: "New message",
    ANNOUNCEMENT: "Announcement",
    OUTPUT: "New output",
    CERTIFICATE: "Certificate issued",
    GRADE: "Feedback on your work",
    POSTING_APPROVED: "Posting rights granted",
    PROJECT_APPROVED: "Project approved",
  };
  return map[type] ?? null;
}

export async function runDigest(baseUrl: string): Promise<{ considered: number; sent: number }> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - DIGEST_MIN_HOURS * 3600_000);

  const users = await db.user.findMany({
    where: {
      emailUpdates: true,
      suspended: false,
      OR: [{ lastDigestAt: null }, { lastDigestAt: { lt: cutoff } }],
    },
    select: { id: true, name: true, email: true, lastDigestAt: true },
    take: MAX_USERS_PER_RUN,
  });

  let sent = 0;
  for (const u of users) {
    const since = u.lastDigestAt ?? new Date(0);
    const notes = await db.notification.findMany({
      where: { userId: u.id, read: false, createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
    });
    if (notes.length === 0) continue;

    const items = notes.slice(0, MAX_ITEMS).map((n) => ({
      title: typeLabel(n.type) ? `${typeLabel(n.type)}: ${n.title}` : n.title,
      meta: n.body || undefined,
    }));
    const extra = notes.length - items.length;

    const template: EmailTemplate = {
      preheader: `${notes.length} update${notes.length === 1 ? "" : "s"} waiting for you.`,
      heading: notes.length === 1 ? "You have an update" : `You have ${notes.length} updates`,
      greeting: `Hi ${u.name.split(" ")[0]},`,
      paragraphs: [
        "Here's what happened on Open Research Tunisia while you were away — the things that concern you, in one place.",
      ],
      items,
      afterCta: extra > 0 ? [`…and ${extra} more on the platform.`] : undefined,
      cta: { label: "Open Open Research Tunisia", url: `${baseUrl}/notifications` },
      footerNote: `Sent to ${u.email} as a periodic activity summary. Turn these off anytime in your profile.`,
    };

    const ok = await sendEmail({
      to: u.email,
      subject:
        notes.length === 1
          ? "An update from Open Research Tunisia"
          : `${notes.length} updates from Open Research Tunisia`,
      text: renderEmailText(template),
      html: renderEmailHtml(template),
    });
    if (ok) {
      await db.user.update({ where: { id: u.id }, data: { lastDigestAt: now } });
      sent++;
    }
  }

  return { considered: users.length, sent };
}
