import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc, fileSize, isOnline, relativeTime } from "@/lib/format";
import { Avatar, EmptyState } from "@/components/ui";
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
    <div className="flex h-full min-h-0 flex-col">
      {/* Conversation header */}
      <div className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
        <Link
          href="/messages"
          aria-label="Back to conversations"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-4 hover:bg-tint hover:text-ink md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="relative flex-none">
          <Avatar name={other.name} color={other.avatarColor} src={avatarSrc(other)} size={40} />
          {isOnline(other.lastSeenAt) ? (
            <span
              className="pulse-online absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-card bg-olive"
              aria-label="Online"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/people/${other.id}`}
            className="block truncate text-[15px] font-semibold text-ink no-underline hover:text-brick"
          >
            {other.name}
          </Link>
          {other.headline ? (
            <div className="truncate text-[12px] text-muted">{other.headline}</div>
          ) : null}
        </div>
        <Link
          href={`/people/${other.id}`}
          className="hidden shrink-0 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium text-ink-4 no-underline hover:border-brick hover:text-brick hover:no-underline sm:block"
        >
          View profile
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-5 border-b border-line px-4">
        {tabs.map(([key, label]) => {
          const active = view === key;
          return (
            <Link
              key={key}
              href={`/messages/${other.id}${key === "files" ? "?view=files" : ""}`}
              scroll={false}
              className="whitespace-nowrap px-0.5 pb-2 pt-2.5 text-[13px] no-underline hover:no-underline"
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

      {/* Body */}
      {view === "files" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <SharedFiles messages={messages} meId={me.id} otherName={other.name} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2 sm:px-4">
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
        </div>
      )}
    </div>
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
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-tint text-[10px] font-bold uppercase text-ink-4">
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
