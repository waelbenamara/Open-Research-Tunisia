import "server-only";
import { db } from "./db";
import { sendEmail } from "./email";
import { newMemberEmail } from "./newMemberEmail";

type NewMember = {
  id: string;
  name: string;
  email: string;
  affiliation?: string | null;
  city?: string | null;
};

/**
 * Notify every administrator (in-app + email) that a new member has joined.
 * Resilient by design — it swallows its own errors so a notification or email
 * hiccup can never break the signup flow that calls it.
 */
export async function notifyAdminsOfNewMember(
  member: NewMember,
  origin: string,
  via = "password",
): Promise<void> {
  try {
    const admins = await db.user.findMany({
      where: { role: "ADMIN", suspended: false, id: { not: member.id } },
      select: { id: true, email: true, emailUpdates: true },
    });
    if (admins.length === 0) return;

    const loc = [member.affiliation, member.city].filter(Boolean).join(" · ");
    await db.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "NEW_MEMBER",
        title: "New member joined",
        body: `${member.name} just joined${loc ? ` · ${loc}` : ""}.`,
        link: `/people/${member.id}`,
      })),
    });

    // Email is best-effort and respects each admin's email-updates preference.
    await Promise.allSettled(
      admins
        .filter((a) => a.emailUpdates !== false && a.email)
        .map((a) => sendEmail(newMemberEmail(a.email, member, origin, via))),
    );
  } catch (e) {
    console.error("notifyAdminsOfNewMember failed:", e);
  }
}
