import Link from "next/link";
import { MENTION_TOKEN } from "@/lib/mentions";

/** Render a body, turning @[Name](id) mention tokens into profile links and
 *  preserving line breaks. Safe in server components. */
export function MentionText({ children, className }: { children: string; className?: string }) {
  const text = children ?? "";
  const nodes: React.ReactNode[] = [];
  const re = new RegExp(MENTION_TOKEN);
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <Link
        key={i++}
        href={`/people/${m[2]}`}
        className="font-semibold text-brick no-underline hover:underline"
      >
        @{m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));

  return <span className={`whitespace-pre-wrap break-words ${className ?? ""}`}>{nodes}</span>;
}
