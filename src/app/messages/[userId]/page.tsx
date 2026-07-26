import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc, dateTime, relativeTime } from "@/lib/format";
import { Avatar, Breadcrumb, Shell } from "@/components/ui";
import { Composer } from "./Composer";
import { MarkRead } from "./MarkRead";

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
      suspended: true,
    },
  });
  if (!other) notFound();

  const messages = await db.directMessage.findMany({
    where: {
      OR: [
        { senderId: me.id, recipientId: other.id },
        { senderId: other.id, recipientId: me.id },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  // Group consecutive messages by day for lightweight date separators.
  let lastDay = "";

  return (
    <Shell className="pb-24 pt-7">
      <MarkRead otherId={other.id} />
      <Breadcrumb href="/messages" label="Messages" current={other.name} />

      <div className="mx-auto flex max-w-[720px] flex-col">
        <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
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

        <div className="flex flex-col gap-2.5">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-muted">
              No messages yet — say hello.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === me.id;
              const day = m.createdAt.toDateString();
              const showDay = day !== lastDay;
              lastDay = day;
              return (
                <div key={m.id}>
                  {showDay ? (
                    <div className="my-3 text-center text-[11.5px] uppercase tracking-[0.08em] text-muted">
                      {relativeTime(m.createdAt).includes("ago") &&
                      Date.now() - m.createdAt.getTime() < 86400000
                        ? "Today"
                        : dateTime(m.createdAt).split(",")[0]}
                    </div>
                  ) : null}
                  <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] px-3.5 py-2 text-[14px] leading-[1.5] ${
                        mine
                          ? "bg-brick text-paper"
                          : "border border-line bg-card text-ink-2"
                      }`}
                      style={mine ? { color: "#faf8f3" } : undefined}
                      title={dateTime(m.createdAt)}
                    >
                      <span className="whitespace-pre-wrap break-words">{m.body}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          {other.suspended ? (
            <p className="text-[13px] text-muted">This account is suspended and can't receive messages.</p>
          ) : (
            <Composer recipientId={other.id} recipientName={other.name} />
          )}
        </div>
      </div>
    </Shell>
  );
}
