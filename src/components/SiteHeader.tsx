import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar } from "./ui";
import { UserMenu } from "./UserMenu";

export async function SiteHeader() {
  const user = await getCurrentUser();

  const [unread, unreadMsgs] = user
    ? await Promise.all([
        db.notification.count({ where: { userId: user.id, read: false } }),
        db.directMessage.count({ where: { recipientId: user.id, readAt: null } }),
      ])
    : [0, 0];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[rgba(250,248,243,0.94)] backdrop-blur-[8px]">
      <div className="mx-auto flex max-w-[1200px] items-center gap-7 px-8 py-3">
        <Link href="/" className="flex items-center gap-[11px] hover:no-underline">
          <div className="grid h-[30px] w-[30px] place-items-center bg-brick font-serif text-[17px] font-semibold text-paper">
            OR
          </div>
          <div className="font-serif text-[20px] font-semibold tracking-[0.01em] text-ink">
            Open Research Tunisia
          </div>
        </Link>

        <nav className="hidden items-center gap-[22px] text-[14px] font-medium md:flex">
          <Link href="/" className="text-ink-4 no-underline hover:text-ink hover:no-underline">
            Discover
          </Link>
          <Link
            href="/publications"
            className="text-ink-4 no-underline hover:text-ink hover:no-underline"
          >
            Publications
          </Link>
          <Link href="/people" className="text-ink-4 no-underline hover:text-ink hover:no-underline">
            People
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="text-ink-4 no-underline hover:text-ink hover:no-underline"
            >
              My work
            </Link>
          ) : null}
          {user?.role === "ADMIN" ? (
            <Link href="/admin" className="text-ink-4 no-underline hover:text-ink hover:no-underline">
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex-1" />

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/messages"
              className="relative text-[13px] font-medium text-ink-4 no-underline hover:text-ink hover:no-underline"
              aria-label={`Messages${unreadMsgs ? `, ${unreadMsgs} unread` : ""}`}
            >
              Messages
              {unreadMsgs > 0 ? (
                <span className="ml-1.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brick px-1 text-[10.5px] font-bold text-paper">
                  {unreadMsgs > 99 ? "99+" : unreadMsgs}
                </span>
              ) : null}
            </Link>
            <Link
              href="/notifications"
              className="relative text-[13px] font-medium text-ink-4 no-underline hover:text-ink hover:no-underline"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            >
              Inbox
              {unread > 0 ? (
                <span className="ml-1.5 inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brick px-1 text-[10.5px] font-bold text-paper">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </Link>
            <UserMenu
              name={user.name}
              color={user.avatarColor}
              src={user.avatarSrc}
              role={user.role}
              canPost={user.canPostProjects}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13.5px] font-medium text-ink-4 hover:text-ink">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-brick px-[18px] py-2 text-[13.5px] font-semibold text-paper no-underline hover:bg-brick-dark hover:no-underline"
              style={{ color: "#faf8f3" }}
            >
              Join
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
