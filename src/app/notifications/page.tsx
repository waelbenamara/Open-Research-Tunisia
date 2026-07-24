import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { relativeTime } from "@/lib/format";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/admin";
import { Card, EmptyState, Shell } from "@/components/ui";

export const metadata = { title: "Inbox" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-11">
      <div className="mb-7 flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-[32px] font-medium">Inbox</h1>
        <div className="flex-1" />
        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
            >
              Mark all read ({unread})
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="Nothing here yet."
          hint="Application decisions, new resources, announcements and grades land here."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className="flex items-start gap-4 px-5 py-4"
              // Unread items get a brick spine so the eye finds them instantly.
            >
              <div
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: n.read ? "#e6dfd0" : "#8a3325" }}
                aria-label={n.read ? "read" : "unread"}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink">{n.title}</div>
                {n.body ? (
                  <div className="mt-1 text-[13.5px] leading-[1.55] text-ink-3">{n.body}</div>
                ) : null}
                <div className="mt-1.5 flex items-center gap-3 text-[12px] text-muted">
                  <span>{relativeTime(n.createdAt)}</span>
                  {n.link ? (
                    <Link href={n.link} className="font-semibold">
                      Open
                    </Link>
                  ) : null}
                  {!n.read ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="notificationId" value={n.id} />
                      <button
                        type="submit"
                        className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-muted hover:text-brick"
                      >
                        Mark read
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
