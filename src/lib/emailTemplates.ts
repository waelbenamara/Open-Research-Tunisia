import "server-only";

/**
 * Branded transactional-email templates.
 *
 * Email HTML is its own dialect: tables for layout, every style inline, no
 * webfonts, no flexbox — Gmail strips <style> blocks in places and Outlook
 * renders with Word's engine. So Georgia stands in for Newsreader and the
 * system stack for Public Sans, while the colors are the exact tokens from
 * globals.css. Square corners everywhere, like the site.
 *
 * Every email is assembled from one EmailTemplate shape and rendered twice —
 * renderEmailHtml + renderEmailText — so the plain-text part never drifts
 * out of sync with the HTML part. Callers pass PLAIN STRINGS; escaping
 * happens here.
 */

const C = {
  paper: "#faf8f3",
  card: "#fffefb",
  ink: "#211d16",
  ink3: "#57503f",
  ink4: "#6e675a",
  muted: "#9a927f",
  line: "#e6dfd0",
  brick: "#8a3325",
};

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type EmailTemplate = {
  /** Inbox preview line, invisible in the opened email. */
  preheader: string;
  heading: string;
  /** "Hi Yasmine," — omitted entirely when not set. */
  greeting?: string;
  paragraphs: string[];
  /** Optional numbered steps (the welcome email's three-step path). */
  steps?: { title: string; body: string }[];
  cta?: { label: string; url: string };
  /** Small muted lines after the button — fallback link, expiry note. */
  afterCta?: string[];
  /** Why they received this — required, it's basic email courtesy. */
  footerNote: string;
};

export function renderEmailHtml(t: EmailTemplate): string {
  const paragraphs = t.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px; font-family:${SANS}; font-size:15px; line-height:1.65; color:${C.ink3};">${esc(p)}</p>`,
    )
    .join("\n");

  const steps = t.steps?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 8px;">
        ${t.steps
          .map(
            (s, i) => `
        <tr>
          <td width="40" valign="top" style="padding:12px 0; border-top:1px solid ${C.line}; font-family:${SERIF}; font-size:24px; line-height:1.2; color:${C.brick};">${i + 1}</td>
          <td valign="top" style="padding:12px 0 12px 6px; border-top:1px solid ${C.line};">
            <div style="font-family:${SANS}; font-size:14.5px; font-weight:700; color:${C.ink};">${esc(s.title)}</div>
            <div style="font-family:${SANS}; font-size:13.5px; line-height:1.6; color:${C.ink4}; margin-top:3px;">${esc(s.body)}</div>
          </td>
        </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const cta = t.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 6px;">
        <tr>
          <td bgcolor="${C.brick}" style="mso-padding-alt:13px 28px;">
            <a href="${esc(t.cta.url)}" style="display:inline-block; padding:13px 28px; font-family:${SANS}; font-size:14px; font-weight:700; color:${C.paper}; text-decoration:none;">${esc(t.cta.label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  const afterCta = t.afterCta?.length
    ? t.afterCta
        .map(
          (p) =>
            `<p style="margin:10px 0 0; font-family:${SANS}; font-size:12.5px; line-height:1.6; color:${C.muted}; word-break:break-all;">${esc(p)}</p>`,
        )
        .join("\n")
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${esc(t.heading)}</title>
</head>
<body style="margin:0; padding:0; background-color:${C.paper};">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${esc(t.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.paper}">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:560px; max-width:100%;">

          <tr>
            <td style="padding:0 8px 14px;">
              <span style="font-family:${SANS}; font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:${C.brick};">Open Research Tunisia</span>
            </td>
          </tr>

          <tr>
            <td bgcolor="${C.card}" style="border:1px solid ${C.line}; padding:34px 40px 30px;">
              <h1 style="margin:0 0 16px; font-family:${SERIF}; font-size:26px; font-weight:500; line-height:1.25; color:${C.ink};">${esc(t.heading)}</h1>
              ${t.greeting ? `<p style="margin:0 0 14px; font-family:${SANS}; font-size:15px; line-height:1.65; color:${C.ink3};">${esc(t.greeting)}</p>` : ""}
              ${paragraphs}
              ${steps}
              ${cta}
              ${afterCta}
            </td>
          </tr>

          <tr>
            <td style="padding:18px 8px 0;">
              <p style="margin:0 0 4px; font-family:${SANS}; font-size:12px; line-height:1.6; color:${C.muted};">${esc(t.footerNote)}</p>
              <p style="margin:0; font-family:${SANS}; font-size:12px; line-height:1.6; color:${C.muted};">
                Open Research Tunisia · <a href="https://openresearchtunisia.org" style="color:${C.ink4}; text-decoration:underline;">openresearchtunisia.org</a> — research shouldn&#39;t require permission.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailText(t: EmailTemplate): string {
  const lines: string[] = ["OPEN RESEARCH TUNISIA", "", t.heading, ""];
  if (t.greeting) lines.push(t.greeting, "");
  for (const p of t.paragraphs) lines.push(p, "");
  if (t.steps?.length) {
    for (const [i, s] of t.steps.entries()) lines.push(`${i + 1}. ${s.title}`, `   ${s.body}`, "");
  }
  if (t.cta) lines.push(`${t.cta.label}:`, t.cta.url, "");
  for (const p of t.afterCta ?? []) lines.push(p, "");
  lines.push("—", t.footerNote, "Open Research Tunisia · https://openresearchtunisia.org");
  return lines.join("\n");
}
