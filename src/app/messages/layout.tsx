import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConversations } from "@/lib/conversations";
import { MessagesShell } from "./MessagesShell";

export const metadata = { title: "Messages" };

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/messages");

  const conversations = await getConversations(me.id);

  return (
    <div className="py-5">
      <MessagesShell conversations={conversations}>{children}</MessagesShell>
    </div>
  );
}
