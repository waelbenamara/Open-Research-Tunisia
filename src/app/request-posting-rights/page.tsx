import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fullDate } from "@/lib/format";
import { statusPill } from "@/lib/theme";
import { Card, Pill } from "@/components/ui";
import { PostingRequestForm } from "./PostingRequestForm";

export const metadata = { title: "Request posting rights" };

export default async function RequestPostingRightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/request-posting-rights");

  if (user.canPostProjects || user.role === "ADMIN") {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 sm:px-8 py-20 text-center">
        <h1 className="font-serif text-[28px] font-medium">You already have posting rights</h1>
        <p className="mt-3 text-[15px] text-ink-3">
          Go ahead and <Link href="/projects/new">post a project</Link> or{" "}
          <Link href="/workshops/new">run a workshop</Link>.
        </p>
      </div>
    );
  }

  const requests = await db.postingRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-[600px] px-4 sm:px-8 pb-24 pt-16">
      <div className="eyebrow mb-2.5" style={{ color: "#8a3325" }}>
        Become a project lead
      </div>
      <h1 className="font-serif text-[32px] font-medium leading-tight balance">
        Request the right to post projects.
      </h1>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-3 pretty">
        Anyone can contribute here, but posting a project means taking responsibility for other
        people&apos;s time — reviewing applications, running meetings, and crediting work honestly.
        An admin reads every request. You do not need a PhD; you do need a real plan.
      </p>

      <div className="mt-8">
        <PostingRequestForm />
      </div>

      {requests.length > 0 ? (
        <div className="mt-10">
          <div className="eyebrow mb-3">Your requests</div>
          <div className="flex flex-col gap-2.5">
            {requests.map((r) => {
              const p = statusPill(r.status);
              return (
                <Card key={r.id} className="flex items-start gap-3.5 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold">{r.proposal}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      Requested {fullDate(r.createdAt)}
                    </div>
                    {r.decisionNote ? (
                      <div className="mt-1.5 text-[13px] text-ink-4">{r.decisionNote}</div>
                    ) : null}
                  </div>
                  <Pill bg={p.bg} fg={p.fg}>
                    {p.label}
                  </Pill>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
