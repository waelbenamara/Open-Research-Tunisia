import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Presence } from "@/components/Presence";
import { Tour } from "@/components/Tour";
import { BottomNav } from "@/components/BottomNav";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Open Research Tunisia",
    template: "%s · Open Research Tunisia",
  },
  description:
    "Join real research projects as a contributor — no title required. Learn the craft through hands-on workshops and help publish research that matters.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const [unread, unreadMsgs] = user
    ? await Promise.all([
        db.notification.count({ where: { userId: user.id, read: false } }),
        db.directMessage.count({ where: { recipientId: user.id, readAt: null } }),
      ])
    : [0, 0];

  return (
    <html lang="en" className={`${newsreader.variable} ${publicSans.variable}`}>
      <body className="flex min-h-screen flex-col">
        {user ? <Presence /> : null}
        {user ? <Tour /> : null}
        <SiteHeader />
        {/* Extra bottom space on phones so the fixed tab bar never covers content. */}
        <main className={`flex-1 ${user ? "pb-[68px] md:pb-0" : ""}`}>{children}</main>
        <div className={user ? "hidden md:block" : ""}>
          <SiteFooter />
        </div>
        {user ? <BottomNav unread={unread} unreadMsgs={unreadMsgs} /> : null}
      </body>
    </html>
  );
}
