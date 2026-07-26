import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc, isOnline, relativeTime } from "@/lib/format";
import { Avatar, EmptyState, Shell } from "@/components/ui";
import { NewMessage } from "./NewMessage";

export const metadata = { title: "Messages" };

type Partner = {
  id: string;
  name: string;
  avatarColor: string;
  avatarUrl: string | null;
  avatarPath: string | null;
  headline: string | null;
  lastSeenAt: Date | null;
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
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-medium">Messages</h1>
          <p className="mt-1 text-[14px] text-ink-4">
            Private one-to-one conversations with anyone on the platform.
          </p>
        </div>
        <NewMessage />
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title="No messages yet."
          hint={<>Tap <strong>New message</strong> above to search for someone and say hello.</>}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {conversations.map((c) => {
            const unread = c.unread > 0;
            const online = isOnline(c.partner.lastSeenAt);
            return (
              <Link
                key={c.partner.id}
                href={`/messages/${c.partner.id}`}
                className={`group relative flex items-center gap-4 rounded-[14px] border px-3.5 py-3.5 no-underline transition-all hover:-translate-y-px hover:no-underline hover:shadow-sm ${
                  unread
                    ? "border-brick-tint-2 bg-brick-tint/60 hover:bg-brick-tint"
                    : "border-transparent hover:border-line hover:bg-card"
                }`}
              >
                {unread ? (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-brick" aria-hidden />
                ) : null}
                <div className="relative flex-none">
                  <Avatar
                    name={c.partner.name}
                    color={c.partner.avatarColor}
                    src={avatarSrc(c.partner)}
                    size={46}
                  />
                  {online ? (
                    <span
                      className="pulse-online absolute bottom-0 right-0 h-[12px] w-[12px] rounded-full border-2 border-paper bg-olive"
                      aria-label="Online"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14.5px] font-semibold text-ink">{c.partner.name}</span>
                    <span className="text-[12px] text-muted">{relativeTime(c.at)}</span>
                  </div>
                  <div
                    className={`mt-0.5 truncate text-[13px] ${
                      unread ? "font-semibold text-ink-2" : "text-ink-4"
                    }`}
                  >
                    {c.fromMe ? <span className="text-muted">You: </span> : null}
                    {c.last}
                  </div>
                </div>
                {unread ? (
                  <span className="inline-grid h-[21px] min-w-[21px] place-items-center rounded-full bg-brick px-1.5 text-[11px] font-bold text-paper shadow-sm">
                    {c.unread > 99 ? "99+" : c.unread}
                  </span>
                ) : (
                  <span className="text-line-strong opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                    →
                  </span>
                )}
              </Link>
            );
          })}
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
  lastSeenAt: true,
} as const;
