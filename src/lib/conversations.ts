import { db } from "@/lib/db";
import { avatarSrc, isOnline } from "@/lib/format";

export type ConversationRow = {
  id: string; // partner user id
  name: string;
  avatarColor: string;
  avatarSrc: string | null;
  online: boolean;
  lastSeenAt: string | null;
  last: string;
  hasAttachment: boolean;
  at: string; // ISO
  fromMe: boolean;
  unread: number;
};

const partnerSelect = {
  id: true,
  name: true,
  avatarColor: true,
  avatarUrl: true,
  avatarPath: true,
  lastSeenAt: true,
} as const;

/**
 * Fold every direct message the user is part of into one row per conversation
 * partner: latest message, timestamp, and unread count. Shared by the messages
 * sidebar (initial render) and its polling endpoint (live updates).
 */
export async function getConversations(meId: string): Promise<ConversationRow[]> {
  const messages = await db.directMessage.findMany({
    where: { OR: [{ senderId: meId }, { recipientId: meId }] },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: {
      body: true,
      senderId: true,
      recipientId: true,
      readAt: true,
      createdAt: true,
      _count: { select: { attachments: true } },
      sender: { select: partnerSelect },
      recipient: { select: partnerSelect },
    },
  });

  const byPartner = new Map<string, ConversationRow>();
  for (const m of messages) {
    const fromMe = m.senderId === meId;
    const partner = fromMe ? m.recipient : m.sender;
    let row = byPartner.get(partner.id);
    if (!row) {
      row = {
        id: partner.id,
        name: partner.name,
        avatarColor: partner.avatarColor,
        avatarSrc: avatarSrc(partner),
        online: isOnline(partner.lastSeenAt),
        lastSeenAt: partner.lastSeenAt ? partner.lastSeenAt.toISOString() : null,
        last: m.body,
        hasAttachment: m._count.attachments > 0,
        at: m.createdAt.toISOString(),
        fromMe,
        unread: 0,
      };
      byPartner.set(partner.id, row);
    }
    if (!fromMe && m.readAt === null) row.unread += 1;
  }
  return [...byPartner.values()];
}
