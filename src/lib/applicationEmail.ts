import "server-only";
import type { Email } from "./email";
import { renderEmailHtml, renderEmailText, type EmailTemplate } from "./emailTemplates";

/** Sent to a project lead when someone applies to their project. */
export function newApplicationEmail(opts: {
  to: string;
  leadName: string;
  applicantName: string;
  projectTitle: string;
  projectSlug: string;
  role: string;
  motivation: string;
  skills?: string;
  availability?: string;
  origin: string;
}): Email {
  const t: EmailTemplate = {
    preheader: `${opts.applicantName} applied to ${opts.projectTitle}.`,
    heading: "New application to your project",
    greeting: `Hi ${opts.leadName.split(" ")[0]},`,
    paragraphs: [
      `${opts.applicantName} applied to “${opts.projectTitle}” for the role of ${opts.role}.`,
      opts.motivation ? `Why they want to contribute: “${opts.motivation}”` : "",
      opts.skills ? `Relevant skills: ${opts.skills}.` : "",
      opts.availability ? `Availability they offered: ${opts.availability}.` : "",
      "Review it and accept or decline from the project's Applications tab.",
    ].filter(Boolean),
    cta: {
      label: "Review the application",
      url: `${opts.origin}/projects/${opts.projectSlug}?tab=applications`,
    },
    footerNote: `Sent to ${opts.to} because you lead “${opts.projectTitle}” on Open Research Tunisia.`,
  };

  return {
    to: opts.to,
    subject: `New application to ${opts.projectTitle}: ${opts.applicantName}`,
    text: renderEmailText(t),
    html: renderEmailHtml(t),
  };
}
