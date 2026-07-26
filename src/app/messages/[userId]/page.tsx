import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc, isOnline } from "@/lib/format";
import { Avatar, Breadcrumb, Shell } from "@/components/ui";
import { LiveThread } from "./LiveThread";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const u = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  return { title: u ? `Chat with ${u.name}` : "Messages" };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=/messages/${userId}`);
  if (userId === me.id) redirect("/messages");

  const other = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      headline: true,
      avatarColor: true,
      avatarUrl: true,
      avatarPath: true,
      lastSeenAt: true,
      suspended: true,
    },
  });
  if (!other) notFound();

  // Mark their messages to me as read immediately on open (the poll keeps this
  // fresh afterward).
  await db.directMessage.updateMany({
    where: { senderId: other.id, recipientId: me.id, readAt: null },
    data: { readAt: new Date() },
  });

  const messages = await db.directMessage.findMany({
    where: {
      OR: [
        { senderId: me.id, recipientId: other.id },
        { senderId: other.id, recipientId: me.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, body: true, senderId: true, createdAt: true },
  });

  const lastReadMine = await db.directMessage.findFirst({
    where: { senderId: me.id, recipientId: other.id, readAt: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return (
    <Shell className="pb-24 pt-7">
      <Breadcrumb href="/messages" label="Messages" current={other.name} />

      <div className="mx-auto flex max-w-[720px] flex-col">
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <Avatar name={other.name} color={other.avatarColor} src={avatarSrc(other)} size={42} />
          <div className="flex-1">
            <Link
              href={`/people/${other.id}`}
              className="text-[16px] font-semibold text-ink no-underline hover:text-brick"
            >
              {other.name}
            </Link>
            {other.headline ? (
              <div className="text-[12.5px] text-muted">{other.headline}</div>
            ) : null}
          </div>
        </div>

        <LiveThread
          meId={me.id}
          other={{
            id: other.id,
            online: isOnline(other.lastSeenAt),
            lastSeenAt: other.lastSeenAt ? other.lastSeenAt.toISOString() : null,
            suspended: other.suspended,
          }}
          initialMessages={messages.map((m) => ({
            id: m.id,
            body: m.body,
            senderId: m.senderId,
            createdAt: m.createdAt.toISOString(),
          }))}
          initialSeenUpToAt={lastReadMine?.createdAt.toISOString() ?? null}
        />
      </div>
    </Shell>
  );
}
