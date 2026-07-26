import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc, relativeTime } from "@/lib/format";
import { Avatar, EmptyState, Shell } from "@/components/ui";

export const metadata = { title: "Messages" };

type Partner = {
  id: string;
  name: string;
  avatarColor: string;
  avatarUrl: string | null;
  avatarPath: string | null;
  headline: string | null;
};

export default async function MessagesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/messages");

  // Pull the recent messages I'm part of (either direction) and fold them into
  // one row per conversation partner — latest message + unread count.
  const messages = await db.directMessage.findMany({
    where: { OR: [{ senderId: me.id }, { recipientId: me.id }] },
    orderBy: { createdAt: "desc" },
    take: 400,
    include: {
      sender: { select: partnerSelect },
      recipient: { select: partnerSelect },
    },
  });

  type Row = { partner: Partner; last: string; at: Date; fromMe: boolean; unread: number };
  const byPartner = new Map<string, Row>();
  for (const m of messages) {
    const fromMe = m.senderId === me.id;
    const partner = (fromMe ? m.recipient : m.sender) as Partner;
    const existing = byPartner.get(partner.id);
    if (!existing) {
      byPartner.set(partner.id, {
        partner,
        last: m.body,
        at: m.createdAt,
        fromMe,
        unread: 0,
      });
    }
    // Count unread = messages sent TO me that I haven't read.
    if (!fromMe && m.readAt === null) {
      const row = byPartner.get(partner.id)!;
      row.unread += 1;
    }
  }
  const conversations = [...byPartner.values()];

  return (
    <Shell className="pb-24 pt-11">
      <h1 className="font-serif text-[32px] font-medium">Messages</h1>
      <p className="mb-8 mt-1 text-[14px] text-ink-4">
        Private one-to-one conversations. Reach anyone from their profile.
      </p>

      {conversations.length === 0 ? (
        <EmptyState
          title="No messages yet."
          hint={
            <>
              Find someone in the <Link href="/people">people directory</Link> and start a
              conversation.
            </>
          }
        />
      ) : (
        <div className="flex flex-col border-t border-line">
          {conversations.map((c) => (
            <Link
              key={c.partner.id}
              href={`/messages/${c.partner.id}`}
              className="flex items-center gap-4 border-b border-line-soft px-2 py-4 no-underline transition-colors hover:bg-tint hover:no-underline"
            >
              <Avatar
                name={c.partner.name}
                color={c.partner.avatarColor}
                src={avatarSrc(c.partner)}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[14.5px] font-semibold text-ink">{c.partner.name}</span>
                  <span className="text-[12px] text-muted">{relativeTime(c.at)}</span>
                </div>
                <div
                  className={`mt-0.5 truncate text-[13px] ${
                    c.unread > 0 ? "font-semibold text-ink-2" : "text-ink-4"
                  }`}
                >
                  {c.fromMe ? <span className="text-muted">You: </span> : null}
                  {c.last}
                </div>
              </div>
              {c.unread > 0 ? (
                <span className="inline-grid h-[20px] min-w-[20px] place-items-center rounded-full bg-brick px-1.5 text-[11px] font-bold text-paper">
                  {c.unread > 99 ? "99+" : c.unread}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}

const partnerSelect = {
  id: true,
  name: true,
  avatarColor: true,
  avatarUrl: true,
  avatarPath: true,
  headline: true,
} as const;
