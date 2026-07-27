// A mention is stored inline as a token: @[Display Name](userId)
export const MENTION_TOKEN = /@\[([^\]]+)\]\(([a-zA-Z0-9_-]+)\)/g;

/** Replace mention tokens with plain "@Name" (for notification bodies, previews). */
export function mentionPlainText(body: string): string {
  return body.replace(MENTION_TOKEN, (_full, name) => `@${name}`);
}

/** Unique user ids mentioned in a body (for notifications). */
export function extractMentionIds(body: string): string[] {
  const ids = new Set<string>();
  const re = new RegExp(MENTION_TOKEN);
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) ids.add(m[2]);
  return [...ids];
}

/** Turn display text + chosen mentions into the stored form with tokens.
 *  Replaces the first `@Name` occurrence for each mention. */
export function buildMentionBody(text: string, mentions: { id: string; name: string }[]): string {
  let out = text;
  for (const m of mentions) {
    const needle = `@${m.name}`;
    const idx = out.indexOf(needle);
    if (idx !== -1) {
      out = out.slice(0, idx) + `@[${m.name}](${m.id})` + out.slice(idx + needle.length);
    }
  }
  return out;
}
