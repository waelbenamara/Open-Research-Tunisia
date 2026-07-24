import Link from "next/link";
import { db } from "@/lib/db";
import { avatarSrc, relativeTime } from "@/lib/format";
import { statusPill } from "@/lib/theme";
import { issueCertificatesAction, markAttendanceAction, updateSessionAction } from "@/actions/workshops";
import { Avatar, Card, EmptyState, Pill, SectionLabel } from "@/components/ui";
import { Details } from "@/components/Collapse";

type SessionRef = { id: string; index: number; title: string };

export async function RosterTab({
  workshopId,
  sessions,
  threshold,
}: {
  workshopId: string;
  sessions: SessionRef[];
  threshold: number;
}) {
  const [enrollments, attendance, certificates] = await Promise.all([
    db.enrollment.findMany({
      where: { workshopId },
      include: {
        user: { select: { id: true, name: true, avatarColor: true, avatarUrl: true, avatarPath: true, affiliation: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { enrolledAt: "asc" }],
    }),
    db.attendance.findMany({
      where: { sessionId: { in: sessions.map((s) => s.id) }, present: true },
      select: { userId: true, sessionId: true },
    }),
    db.certificate.findMany({ where: { workshopId }, select: { userId: true, code: true } }),
  ]);

  const attendedBy = new Map<string, Set<string>>();
  for (const a of attendance) {
    if (!attendedBy.has(a.userId)) attendedBy.set(a.userId, new Set());
    attendedBy.get(a.userId)!.add(a.sessionId);
  }
  const certBy = new Map(certificates.map((c) => [c.userId, c.code]));

  const active = enrollments.filter((e) => ["ENROLLED", "COMPLETED"].includes(e.status));
  const waitlist = enrollments.filter((e) => e.status === "WAITLIST");

  return (
    <div className="flex flex-col gap-8">
      {/* Attendance per session */}
      <div>
        <SectionLabel>Attendance</SectionLabel>
        {sessions.length === 0 ? (
          <EmptyState title="Add sessions before taking attendance." />
        ) : (
          sessions.map((s) => (
            <Details key={s.id} label={`Session ${s.index} — ${s.title}`}>
              <form action={markAttendanceAction} className="flex flex-col gap-3">
                <input type="hidden" name="sessionId" value={s.id} />
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {active.length === 0 ? (
                    <div className="text-[13px] text-muted">Nobody enrolled yet.</div>
                  ) : (
                    active.map((e) => (
                      <label
                        key={e.id}
                        className="flex cursor-pointer items-center gap-2 text-[13px] font-normal"
                      >
                        <input
                          type="checkbox"
                          name="present"
                          value={e.userId}
                          defaultChecked={attendedBy.get(e.userId)?.has(s.id) ?? false}
                          className="!w-auto"
                        />
                        {e.user.name}
                      </label>
                    ))
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="cursor-pointer border-none bg-brick px-5 py-2 text-[13px] font-semibold"
                    style={{ color: "#faf8f3" }}
                  >
                    Save attendance
                  </button>
                </div>
              </form>

              <form
                action={updateSessionAction}
                className="mt-3 flex flex-wrap items-end gap-2.5 border-t border-line-soft pt-3"
              >
                <input type="hidden" name="sessionId" value={s.id} />
                <div className="min-w-[180px] flex-1">
                  <label className="!text-[12px]">Live meeting link</label>
                  <input name="meetingUrl" placeholder="https://meet…" className="!py-1.5 !text-[13px]" />
                </div>
                <div className="min-w-[180px] flex-1">
                  <label className="!text-[12px]">Recording link</label>
                  <input name="recordingUrl" placeholder="https://…" className="!py-1.5 !text-[13px]" />
                </div>
                <button
                  type="submit"
                  className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                >
                  Save links
                </button>
              </form>
            </Details>
          ))
        )}
      </div>

      {/* Roster */}
      <div>
        <SectionLabel>Enrolled ({active.length})</SectionLabel>
        <div className="flex flex-col gap-2">
          {active.length === 0 ? (
            <EmptyState title="No enrolments yet." />
          ) : (
            active.map((e) => {
              const attended = attendedBy.get(e.userId)?.size ?? 0;
              const pct = sessions.length ? Math.round((attended / sessions.length) * 100) : 0;
              const code = certBy.get(e.userId);
              return (
                <Card key={e.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <Avatar name={e.user.name} color={e.user.avatarColor} src={avatarSrc(e.user)} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/people/${e.user.id}`}
                      className="text-[14px] font-semibold text-ink no-underline hover:text-brick"
                    >
                      {e.user.name}
                    </Link>
                    <div className="text-[12.5px] text-muted">
                      {e.user.affiliation ?? e.user.email} · joined {relativeTime(e.enrolledAt)}
                    </div>
                  </div>
                  <div className="text-right text-[12.5px]">
                    <div className="font-semibold text-ink">
                      {attended}/{sessions.length} sessions
                    </div>
                    <div className="text-muted">{pct}% attendance</div>
                  </div>
                  {code ? (
                    <Link href={`/verify/${code}`} className="text-[12px] font-mono">
                      {code}
                    </Link>
                  ) : pct >= threshold ? (
                    <Pill bg="#e4ecdb" fg="#3e5730">
                      Eligible
                    </Pill>
                  ) : (
                    <Pill bg="#efe9dc" fg="#6e675a">
                      Below {threshold}%
                    </Pill>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {waitlist.length > 0 ? (
        <div>
          <SectionLabel>Waitlist ({waitlist.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {waitlist.map((e) => {
              const p = statusPill(e.status);
              return (
                <Card key={e.id} className="flex items-center gap-4 px-5 py-3">
                  <Avatar name={e.user.name} color={e.user.avatarColor} src={avatarSrc(e.user)} size={28} />
                  <div className="flex-1 text-[13.5px] font-semibold">{e.user.name}</div>
                  <Pill bg={p.bg} fg={p.fg}>
                    {p.label}
                  </Pill>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <SectionLabel>Certificates</SectionLabel>
        <Card className="px-5 py-4">
          <p className="mb-3 text-[13.5px] leading-relaxed text-ink-3">
            Issues a verifiable certificate to every enrollee who attended at least{" "}
            <strong>{threshold}%</strong> of sessions, marks them complete, and adds the workshop to
            their public record. Already-issued certificates are skipped.
          </p>
          <form action={issueCertificatesAction}>
            <input type="hidden" name="workshopId" value={workshopId} />
            <button
              type="submit"
              className="cursor-pointer border-none bg-olive px-5 py-2.5 text-[13px] font-semibold hover:bg-olive-dark"
              style={{ color: "#faf8f3" }}
            >
              Issue certificates &amp; close workshop
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
