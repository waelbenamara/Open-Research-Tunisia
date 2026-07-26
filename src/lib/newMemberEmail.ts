import "server-only";
import type { Email } from "./email";
import { renderEmailHtml, renderEmailText, type EmailTemplate } from "./emailTemplates";

type NewMember = {
  id: string;
  name: string;
  email: string;
  affiliation?: string | null;
  city?: string | null;
};

const VIA_LABEL: Record<string, string> = {
  google: " using Google",
  github: " using GitHub",
  password: "",
};

/** Sent to each administrator when a new member joins the platform. */
export function newMemberEmail(
  to: string,
  member: NewMember,
  origin: string,
  via: string = "password",
): Email {
  const loc = [member.affiliation, member.city].filter(Boolean).join(" · ");
  const t: EmailTemplate = {
    preheader: `${member.name} just joined Open Research Tunisia.`,
    heading: "A new member just joined",
    greeting: "Hi,",
    paragraphs: [
      `${member.name} (${member.email}) created an account on Open Research Tunisia${VIA_LABEL[via] ?? ""}.`,
      loc ? `They listed: ${loc}.` : "They haven't added an affiliation yet.",
      "You're receiving this because you're an administrator.",
    ],
    cta: { label: "View their profile", url: `${origin}/people/${member.id}` },
    footerNote: "You receive new-member alerts as an administrator of Open Research Tunisia.",
  };

  return {
    to,
    subject: `New member: ${member.name}`,
    text: renderEmailText(t),
    html: renderEmailHtml(t),
  };
}
