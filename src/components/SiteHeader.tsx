import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserMenu } from "./UserMenu";
import { TourButton } from "./TourButton";
import { MobileNav } from "./MobileNav";

export async function SiteHeader() {
  const user = await getCurrentUser();

  const [unread, unreadMsgs] = user
    ? await Promise.all([
        db.notification.count({ where: { userId: user.id, read: false } }),
        db.directMessage.count({ where: { recipientId: user.id, readAt: null } }),
      ])
    : [0, 0];

  const mobileLinks: { href: string; label: string; badge?: number }[] = [
    { href: "/", label: "Discover" },
    ...(user ? [{ href: "/feed", label: "Feed" }] : []),
    { href: "/publications", label: "Publications" },
    { href: "/people", label: "People" },
    ...(user ? [{ href: "/dashboard", label: "My work" }] : []),
    ...(user ? [{ href: "/messages", label: "Messages", badge: unreadMsgs }] : []),
    ...(user ? [{ href: "/notifications", label: "Inbox", badge: unread }] : []),
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
    ...(user ? [] : [{ href: "/login", label: "Sign in" }, { href: "/register", label: "Join" }]),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[rgba(250,248,243,0.94)] backdrop-blur-[8px]">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 sm:gap-7 sm:px-8">
        <MobileNav links={mobileLinks} />

        <Link href="/" className="flex items-center gap-[11px] hover:no-underline">
          <div className="grid h-[30px] w-[30px] shrink-0 place-items-center bg-brick font-serif text-[17px] font-semibold text-paper">
            OR
          </div>
          <div className="hidden font-serif text-[20px] font-semibold tracking-[0.01em] text-ink sm:block">
            Open Research Tunisia
          </div>
        </Link>

        <nav className="hidden items-center gap-[22px] text-[14px] font-medium md:flex">
          <Link
            href="/"
            data-tour="discover"
            className="text-ink-4 no-underline hover:text-ink hover:no-underline"
          >
            Discover
          </Link>
          {user ? (
            <Link
              href="/feed"
              data-tour="feed"
              className="text-ink-4 no-underline hover:text-ink hover:no-underline"
            >
              Feed
            </Link>
          ) : null}
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
              data-tour="mywork"
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
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:block">
              <TourButton />
            </span>
            <Link
              href="/messages"
              data-tour="messages"
              className="relative hidden text-[13px] font-medium text-ink-4 no-underline hover:text-ink hover:no-underline md:inline-flex md:items-center"
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
              data-tour="inbox"
              className="relative hidden text-[13px] font-medium text-ink-4 no-underline hover:text-ink hover:no-underline md:inline-flex md:items-center"
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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-[13.5px] font-medium text-ink-4 hover:text-ink">
              Sign in
            </Link>
            <Link
              href="/register"
              className="whitespace-nowrap bg-brick px-3.5 py-2 text-[13.5px] font-semibold text-paper no-underline hover:bg-brick-dark hover:no-underline sm:px-[18px]"
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
