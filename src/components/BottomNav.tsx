"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A fixed bottom tab bar for phones — the primary destinations within thumb
 *  reach. Hidden on md+ where the header nav takes over. */
export function BottomNav({ unread, unreadMsgs }: { unread: number; unreadMsgs: number }) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Discover", active: pathname === "/", icon: HomeIcon },
    { href: "/feed", label: "Feed", active: pathname.startsWith("/feed"), icon: FeedIcon },
    { href: "/messages", label: "Chats", active: pathname.startsWith("/messages"), icon: ChatIcon, badge: unreadMsgs },
    { href: "/notifications", label: "Inbox", active: pathname.startsWith("/notifications"), icon: BellIcon, badge: unread },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[rgba(250,248,243,0.97)] backdrop-blur-[8px] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="flex items-stretch">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2 no-underline hover:no-underline"
              style={{ color: it.active ? "#8a3325" : "#6e675a" }}
              aria-current={it.active ? "page" : undefined}
            >
              <span className="relative">
                <Icon filled={it.active} />
                {it.badge && it.badge > 0 ? (
                  <span className="absolute -right-2 -top-1.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-brick px-1 text-[9.5px] font-bold text-paper">
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                ) : null}
              </span>
              <span className="text-[10.5px] font-medium">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type IconProps = { filled?: boolean };
const sw = (filled?: boolean) => (filled ? 2.1 : 1.7);

function HomeIcon({ filled }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 11l8-6.5 8 6.5M6 9.5V19h12V9.5"
        stroke="currentColor"
        strokeWidth={sw(filled)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeedIcon({ filled }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth={sw(filled)} />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth={sw(filled)} strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon({ filled }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 5h14a1 1 0 011 1v9a1 1 0 01-1 1H9l-4 3.5V6a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth={sw(filled)}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon({ filled }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 10a5.5 5.5 0 0111 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5zM10 18.5a2 2 0 004 0"
        stroke="currentColor"
        strokeWidth={sw(filled)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
