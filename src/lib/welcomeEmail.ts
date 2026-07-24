import "server-only";
import type { Email } from "./email";
import { renderEmailHtml, renderEmailText, type EmailTemplate } from "./emailTemplates";

/**
 * The welcome email, shared by the password registration action and the OAuth
 * callback so both signup paths greet people identically. Its three steps
 * mirror /onboarding on purpose — the email is the offline copy of that page.
 */
export function welcomeEmail(name: string, to: string, origin: string): Email {
  const first = name.split(" ")[0];
  const t: EmailTemplate = {
    preheader: "Three steps and you're contributing to real research.",
    heading: "Research shouldn't require permission.",
    greeting: `Hi ${first},`,
    paragraphs: [
      "Welcome to Open Research Tunisia — you now have a seat at the table. Researchers post real projects with real open roles here, workshops teach the exact skills those projects need, and every contribution you make is logged publicly under your name.",
      "The people who go furthest do the same three things first:",
    ],
    steps: [
      {
        title: "Tell us what you can do",
        body: "Project leads search the directory by skill. Even 'Excel, Arabic transcription, patient' gets you found — vagueness doesn't.",
      },
      {
        title: "Pick a project that's recruiting",
        body: "Read the open roles, not the titles. Several explicitly want people with no research background.",
      },
      {
        title: "Close the skill gap with a workshop",
        body: "Free, live, and recorded — attending enough sessions earns a certificate anyone can verify online.",
      },
    ],
    cta: { label: "Start your onboarding", url: `${origin}/onboarding` },
    footerNote: `You're receiving this because an account was created for ${to} on Open Research Tunisia.`,
  };

  return {
    to,
    subject: "Welcome to Open Research Tunisia",
    text: renderEmailText(t),
    html: renderEmailHtml(t),
  };
}
