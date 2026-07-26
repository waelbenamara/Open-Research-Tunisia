import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { acceptCodeOfConductAction } from "@/actions/auth";
import { Button, Card } from "@/components/ui";

export const metadata = { title: "One last thing" };

export default async function AcceptTermsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { cocAcceptedAt: true },
  });
  // Already accepted (e.g. an email signup landing here by accident) → move on.
  if (user?.cocAcceptedAt) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 sm:px-8 py-16">
      <div className="eyebrow mb-2.5" style={{ color: "#8a3325" }}>
        Welcome, {session.name.split(" ")[0]}
      </div>
      <h1 className="font-serif text-[32px] font-medium leading-tight balance">
        One thing before you start.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-3 pretty">
        Everyone here agrees to the same short code of conduct. It&apos;s the thing that keeps an
        open initiative from going the way open initiatives usually go.
      </p>

      <Card className="mt-7 px-6 py-5">
        <ul className="flex flex-col gap-2.5 text-[14px] leading-[1.6] text-ink-2">
          {[
            "Assume the person asking a basic question is who this initiative was built for.",
            "Report results honestly — including the ones that didn't work.",
            "Credit people for what they actually did; authorship is discussed early and in the open.",
            "Respect people's time: keep the hours you commit to, or say so early.",
          ].map((line) => (
            <li key={line} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-brick" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line-soft pt-3.5 text-[13px] text-ink-4">
          Read the full <Link href="/code-of-conduct">code of conduct</Link> — it&apos;s short and we
          mean all of it.
        </p>
      </Card>

      <form action={acceptCodeOfConductAction} className="mt-6">
        <Button type="submit" className="w-full">
          I agree — let&apos;s go
        </Button>
      </form>
    </div>
  );
}
