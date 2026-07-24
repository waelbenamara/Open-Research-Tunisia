import Link from "next/link";
import { db } from "@/lib/db";
import { avatarSrc, fullDate, parseList } from "@/lib/format";
import { statusPill } from "@/lib/theme";
import { decideApplicationAction } from "@/actions/projects";
import { Avatar, Card, EmptyState, Pill } from "@/components/ui";

export async function ApplicationsTab({ projectId }: { projectId: string }) {
  const apps = await db.application.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarColor: true,
          avatarUrl: true,
          avatarPath: true,
          affiliation: true,
          headline: true,
          skills: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pending = apps.filter((a) => a.status === "PENDING" || a.status === "UNDER_REVIEW");
  const decided = apps.filter((a) => !["PENDING", "UNDER_REVIEW"].includes(a.status));

  if (apps.length === 0) {
    return (
      <EmptyState
        title="No applications yet."
        hint="Make sure your open roles describe what a contributor would actually do."
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-2.5">
        <div className="eyebrow">Awaiting your decision ({pending.length})</div>
        {pending.length === 0 ? (
          <EmptyState title="All caught up." />
        ) : (
          pending.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3.5 px-5 py-4">
              <div className="flex items-start gap-4">
                <Avatar name={a.user.name} color={a.user.avatarColor} src={avatarSrc(a.user)} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold">
                    <Link
                      href={`/people/${a.user.id}`}
                      className="text-ink no-underline hover:text-brick"
                    >
                      {a.user.name}
                    </Link>
                    <span className="font-normal text-muted"> · {a.roleApplied}</span>
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {[a.user.headline, a.user.affiliation].filter(Boolean).join(" · ")}
                  </div>
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-2">{a.motivation}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-4">
                    <span>
                      <span className="text-muted">Availability:</span> {a.availability}
                    </span>
                    {a.skills ? (
                      <span>
                        <span className="text-muted">Skills:</span> {a.skills}
                      </span>
                    ) : null}
                    {a.cvUrl ? (
                      <a href={a.cvUrl} target="_blank" rel="noopener noreferrer">
                        CV / portfolio
                      </a>
                    ) : null}
                    <span className="text-muted">Applied {fullDate(a.createdAt)}</span>
                  </div>
                  {parseList(a.user.skills).length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {parseList(a.user.skills).map((s) => (
                        <span key={s} className="bg-tint px-2 py-[3px] text-[11px] text-ink-3">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <form
                action={decideApplicationAction}
                className="flex flex-wrap items-end gap-2.5 border-t border-line-soft pt-3.5"
              >
                <input type="hidden" name="applicationId" value={a.id} />
                <div className="min-w-[220px] flex-1">
                  <label className="!text-[12px]">Note to the applicant (optional)</label>
                  <input
                    name="note"
                    placeholder="Welcome — start with the onboarding doc in Resources."
                    className="!py-2 !text-[13px]"
                  />
                </div>
                <button
                  type="submit"
                  name="decision"
                  value="ACCEPTED"
                  className="cursor-pointer border-none bg-olive px-4 py-2 text-[12.5px] font-semibold hover:bg-olive-dark"
                  style={{ color: "#faf8f3" }}
                >
                  Accept
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="DECLINED"
                  className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                >
                  Decline
                </button>
                {a.status === "PENDING" ? (
                  <button
                    type="submit"
                    name="decision"
                    value="UNDER_REVIEW"
                    className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 hover:border-gold hover:text-gold"
                  >
                    Mark under review
                  </button>
                ) : null}
              </form>
            </Card>
          ))
        )}
      </section>

      {decided.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <div className="eyebrow">Decided ({decided.length})</div>
          {decided.map((a) => {
            const p = statusPill(a.status);
            return (
              <Card key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                <Avatar name={a.user.name} color={a.user.avatarColor} src={avatarSrc(a.user)} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">
                    {a.user.name} <span className="font-normal text-muted">· {a.roleApplied}</span>
                  </div>
                  {a.decisionNote ? (
                    <div className="mt-0.5 text-[12.5px] text-ink-4">{a.decisionNote}</div>
                  ) : null}
                </div>
                <Pill bg={p.bg} fg={p.fg}>
                  {p.label}
                </Pill>
              </Card>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
