import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc, fileSize, isOnline, relativeTime } from "@/lib/format";
import { Avatar, Breadcrumb, EmptyState, Shell } from "@/components/ui";
import { LiveThread } from "./LiveThread";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const u = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  return { title: u ? `Chat with ${u.name}` : "Messages" };
}

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { userId } = await params;
  const { view = "chat" } = await searchParams;
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

  await db.directMessage.updateMany({
    where: { senderId: other.id, recipientId: me.id, readAt: null },
    data: { readAt: new Date() },
  });

  const between = {
    OR: [
      { senderId: me.id, recipientId: other.id },
      { senderId: other.id, recipientId: me.id },
    ],
  };

  const [messages, lastReadMine, fileCount] = await Promise.all([
    db.directMessage.findMany({
      where: between,
      orderBy: { createdAt: "asc" },
      take: 300,
      select: {
        id: true,
        body: true,
        senderId: true,
        createdAt: true,
        attachments: {
          select: { id: true, filename: true, blob: { select: { ext: true, size: true } } },
        },
      },
    }),
    db.directMessage.findFirst({
      where: { senderId: me.id, recipientId: other.id, readAt: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.messageAttachment.count({ where: { message: between } }),
  ]);

  const tabs: [string, string][] = [
    ["chat", "Chat"],
    ["files", `Files${fileCount ? ` (${fileCount})` : ""}`],
  ];

  return (
    <Shell className="pb-24 pt-7">
      <Breadcrumb href="/messages" label="Messages" current={other.name} />

      <div className="mx-auto flex max-w-[720px] flex-col">
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <Avatar name={other.name} color={other.avatarColor} src={avatarSrc(other)} size={44} />
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

        <div className="mb-4 flex gap-5 border-b border-line">
          {tabs.map(([key, label]) => {
            const active = view === key;
            return (
              <Link
                key={key}
                href={`/messages/${other.id}${key === "files" ? "?view=files" : ""}`}
                scroll={false}
                className="whitespace-nowrap px-0.5 pb-2.5 text-[13.5px] no-underline hover:no-underline"
                style={{
                  fontWeight: active ? 600 : 400,
                  color: active ? "#211d16" : "#6e675a",
                  borderBottom: `2px solid ${active ? "#8a3325" : "transparent"}`,
                  marginBottom: -1,
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {view === "files" ? (
          <SharedFiles messages={messages} meId={me.id} otherName={other.name} />
        ) : (
          <LiveThread
            meId={me.id}
            other={{
              id: other.id,
              name: other.name,
              avatarColor: other.avatarColor,
              avatarSrc: avatarSrc(other),
              online: isOnline(other.lastSeenAt),
              lastSeenAt: other.lastSeenAt ? other.lastSeenAt.toISOString() : null,
              suspended: other.suspended,
            }}
            initialMessages={messages.map((m) => ({
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
            }))}
            initialSeenUpToAt={lastReadMine?.createdAt.toISOString() ?? null}
          />
        )}
      </div>
    </Shell>
  );
}

type MsgWithAtt = {
  id: string;
  senderId: string;
  createdAt: Date;
  attachments: { id: string; filename: string; blob: { ext: string; size: number } }[];
};

function SharedFiles({
  messages,
  meId,
  otherName,
}: {
  messages: MsgWithAtt[];
  meId: string;
  otherName: string;
}) {
  const files = messages
    .flatMap((m) =>
      m.attachments.map((a) => ({
        ...a,
        fromMe: m.senderId === meId,
        at: m.createdAt,
      })),
    )
    .reverse();

  if (files.length === 0) {
    return (
      <EmptyState
        title="No files shared yet."
        hint="Attach a file in the chat and it will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col">
      {files.map((f) => (
        <a
          key={f.id}
          href={`/api/messages/attachments/${f.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 border-b border-line-soft px-1 py-3 no-underline hover:bg-tint hover:no-underline"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center bg-tint text-[10px] font-bold uppercase text-ink-4">
            {f.blob.ext}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-ink">{f.filename}</div>
            <div className="text-[12px] text-muted">
              {fileSize(f.blob.size)} · {f.fromMe ? "you" : otherName} · {relativeTime(f.at)}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
