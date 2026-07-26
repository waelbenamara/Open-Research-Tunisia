import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function MessagesIndexPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/messages");

  // The conversation rail lives in the layout; this is the right-pane resting
  // state shown on desktop when no thread is selected.
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-3 p-10 text-center md:flex">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-brick-tint text-[30px]">💬</div>
      <h2 className="font-serif text-[22px] font-medium text-ink">Your messages</h2>
      <p className="max-w-[320px] text-[13.5px] leading-[1.55] text-muted">
        Pick a conversation from the left, or tap <strong className="text-ink-3">New message</strong> to
        find someone and say hello.
      </p>
    </div>
  );
}
