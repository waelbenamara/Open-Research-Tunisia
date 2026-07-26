import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ONLINE_WINDOW_MS } from "@/lib/format";

export const dynamic = "force-dynamic";

const TYPING_WINDOW_MS = 6_000;

/**
 * Live poll for one conversation. Returns messages newer than `?after=<id>`,
 * the partner's presence, whether they're typing to me, and how far they've
 * read my messages (for "Seen"). Viewing the thread also marks their messages
 * to me as read and refreshes my own presence.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const { userId: otherId } = await params;
  const afterId = new URL(request.url).searchParams.get("after") ?? "";

  // Being on the thread counts as presence, and reads their messages to me
  // (plus the notifications those messages generated, so the Inbox badge clears).
  const now = new Date();
  await db.user.update({ where: { id: me.id }, data: { lastSeenAt: now } });
  await db.directMessage.updateMany({
    where: { senderId: otherId, recipientId: me.id, readAt: null },
    data: { readAt: now },
  });
  await db.notification.updateMany({
    where: { userId: me.id, type: "MESSAGE_DIRECT", link: `/messages/${otherId}`, read: false },
    data: { read: true },
  });

  const partner = await db.user.findUnique({
    where: { id: otherId },
    select: { lastSeenAt: true, typingToId: true, typingAt: true },
  });
  if (!partner) return NextResponse.json({ ok: false }, { status: 404 });

  // New messages since the client's cursor (either direction).
  let newMessages: unknown[] = [];
  if (afterId) {
    const cursor = await db.directMessage.findUnique({
      where: { id: afterId },
      select: { createdAt: true },
    });
    if (cursor) {
      const rows = await db.directMessage.findMany({
        where: {
          createdAt: { gt: cursor.createdAt },
          OR: [
            { senderId: me.id, recipientId: otherId },
            { senderId: otherId, recipientId: me.id },
          ],
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          senderId: true,
          createdAt: true,
          attachments: {
            select: { id: true, filename: true, blob: { select: { ext: true, size: true } } },
          },
        },
      });
      newMessages = rows.map((m) => ({
        id: m.id,
        body: m.body,
        senderId: m.senderId,
        createdAt: m.createdAt.toISOString(),
        attachments: m.attachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          ext: a.blob.ext,
          size: a.blob.size,
        })),
      }));
    }
  }

  // How far the partner has read my messages → "Seen" cursor.
  const lastReadMine = await db.directMessage.findFirst({
    where: { senderId: me.id, recipientId: otherId, readAt: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, readAt: true },
  });

  const online = !!partner.lastSeenAt && now.getTime() - partner.lastSeenAt.getTime() < ONLINE_WINDOW_MS;
  const typing =
    partner.typingToId === me.id &&
    !!partner.typingAt &&
    now.getTime() - partner.typingAt.getTime() < TYPING_WINDOW_MS;

  return NextResponse.json({
    ok: true,
    messages: newMessages,
    partner: { online, lastSeenAt: partner.lastSeenAt, typing },
    seenUpToAt: lastReadMine?.createdAt ?? null,
  });
}
