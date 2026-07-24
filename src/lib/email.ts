import "server-only";

/**
 * Outbound email, behind one interface — same pattern as storage.ts.
 *
 * Driver is chosen from the environment:
 *   - `resend`  when RESEND_API_KEY is set (calls Resend's HTTP API directly,
 *               no SDK dependency)
 *   - `console` otherwise — the email is printed to the server log, so flows
 *               that send mail are fully testable with no account at all
 *
 * EMAIL_FROM must be an address on a domain verified in Resend.
 */

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "Open Research Tunisia <noreply@openresearchtunisia.org>";

// Treat "<...>" placeholders and dashboard-truncated keys ("re_abc...") as
// unset, so a half-filled .env logs to the console instead of failing sends.
const resendConfigured = !!API_KEY && !API_KEY.includes("<") && !API_KEY.includes("...");

export const emailDriver: "resend" | "console" = resendConfigured ? "resend" : "console";

export type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** Send an email. Returns false on failure — callers decide whether that's fatal. */
export async function sendEmail(email: Email): Promise<boolean> {
  if (emailDriver === "console") {
    console.log(
      [
        "────────────────────────── email (console driver) ──────────────────────────",
        `To:      ${email.to}`,
        `From:    ${FROM}`,
        `Subject: ${email.subject}`,
        "",
        email.text,
        "─────────────────────────────────────────────────────────────────────────────",
      ].join("\n"),
    );
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      ...(email.html ? { html: email.html } : {}),
    }),
  });

  if (!res.ok) {
    // Log enough to diagnose (status + Resend's message) but never the recipient list.
    console.error(`sendEmail failed: HTTP ${res.status} — ${await res.text()}`);
    return false;
  }
  return true;
}
