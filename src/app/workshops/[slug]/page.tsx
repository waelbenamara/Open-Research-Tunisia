import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canManageWorkshop } from "@/lib/permissions";
import { avatarSrc, dateTime, fileExt, fullDate, parseList, viewableKind } from "@/lib/format";
import { KIND_COLORS } from "@/lib/theme";
import { addResourceAction } from "@/actions/projects";
import { LiveSessionBanner } from "./LiveSessionBanner";
import { SessionManage } from "./SessionManage";
import { RESOURCE_KINDS } from "@/lib/enums";
import {
  Avatar,
  Breadcrumb,
  Card,
  EmptyState,
  Field,
  KindBadge,
  Pill,
  SectionLabel,
  Shell,
} from "@/components/ui";
import { Details } from "@/components/Collapse";
import { ResourceEditForm } from "@/components/ResourceEditForm";
import { Markdown } from "@/components/Markdown";
import { EnrollPanel } from "./EnrollPanel";
import { AssignmentsTab } from "./tabs/AssignmentsTab";
import { RosterTab } from "./tabs/RosterTab";
import { SessionAdmin } from "./SessionAdmin";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await db.workshop.findUnique({ where: { slug }, select: { title: true, summary: true } });
  return w ? { title: w.title, description: w.summary } : {};
}

export default async function WorkshopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "overview" } = await searchParams;
  const user = await getCurrentUser();

  const workshop = await db.workshop.findUnique({
    where: { slug },
    include: {
      facilitator: true,
      sessions: {
        orderBy: { index: "asc" },
        include: { resources: true },
      },
      resources: {
        where: { sessionId: null },
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      enrollments: { select: { id: true, userId: true, status: true } },
      supportsProjects: { select: { slug: true, title: true } },
      announcements: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!workshop) notFound();

  const canManage = await canManageWorkshop(workshop.facilitatorId, user);
  const outcomes = parseList(workshop.outcomes);

  const myEnrollment = user
    ? workshop.enrollments.find((e) => e.userId === user.id) ?? null
    : null;
  const isEnrolled = myEnrollment?.status === "ENROLLED" || myEnrollment?.status === "COMPLETED";
  const taken = workshop.enrollments.filter((e) =>
    ["ENROLLED", "COMPLETED"].includes(e.status),
  ).length;
  const waitlisted = workshop.enrollments.filter((e) => e.status === "WAITLIST").length;

  // Personal progress = share of sessions the learner actually attended.
  const sessionIds = workshop.sessions.map((s) => s.id);
  const myAttendance = user
    ? await db.attendance.findMany({
        where: { userId: user.id, sessionId: { in: sessionIds }, present: true },
        select: { sessionId: true },
      })
    : [];
  const attendedSet = new Set(myAttendance.map((a) => a.sessionId));
  const progressPct =
    workshop.sessions.length > 0
      ? Math.round((attendedSet.size / workshop.sessions.length) * 100)
      : 0;

  const myCertificate = user
    ? await db.certificate.findUnique({
        where: { userId_workshopId: { userId: user.id, workshopId: workshop.id } },
      })
    : null;

  const assignmentCount = await db.assignment.count({ where: { workshopId: workshop.id } });

  const tabs: [string, string][] = [
    ["overview", "Overview"],
    ["assignments", `Assignments${assignmentCount ? ` (${assignmentCount})` : ""}`],
  ];
  if (canManage) tabs.push(["roster", `Roster (${taken})`]);

  const isOverview = tab === "overview";

  // The soonest session that hasn't ended yet — for the live/next-session banner.
  const nowMs = Date.now();
  const nextSession =
    workshop.status !== "COMPLETED"
      ? [...workshop.sessions]
          .filter((s) => s.scheduledAt.getTime() + s.durationMin * 60_000 > nowMs)
          .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null
      : null;
  const onlineish = workshop.format === "ONLINE" || workshop.format === "HYBRID";

  const liveBanner = nextSession ? (
    <LiveSessionBanner
      session={{
        index: nextSession.index,
        title: nextSession.title,
        startISO: nextSession.scheduledAt.toISOString(),
        durationMin: nextSession.durationMin,
        meetingUrl: nextSession.meetingUrl,
      }}
      online={onlineish}
      location={workshop.location}
      canJoin={isEnrolled || canManage}
      isEnrolled={isEnrolled}
    />
  ) : null;

  return (
    <Shell className="pb-24 pt-7">
      <Breadcrumb href="/" label="Discover" current="Workshop" />

      <div className={`grid items-start gap-10 ${isOverview ? "lg:grid-cols-[1fr_340px]" : "grid-cols-1"}`}>
        <div className="flex min-w-0 flex-col gap-8">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-olive">
                Workshop · {workshop.level}
              </span>
              <span className="text-[12.5px] text-muted">
                {workshop.format === "ONLINE"
                  ? "Live online"
                  : workshop.format === "HYBRID"
                    ? `Hybrid · ${workshop.location ?? ""}`
                    : workshop.location ?? "In person"}{" "}
                · {workshop.language}
              </span>
              {workshop.status === "COMPLETED" ? (
                <Pill bg="#efe9dc" fg="#6e675a">
                  Completed
                </Pill>
              ) : null}
            </div>
            <h1 className="mb-3.5 font-serif text-[38px] font-medium leading-[1.15] balance">
              {workshop.title}
            </h1>
            <p className="mb-5 text-[16px] leading-[1.6] text-ink-3 pretty">{workshop.summary}</p>
            <div className="flex items-center gap-3">
              <Avatar
                name={workshop.facilitator.name}
                color={workshop.facilitator.avatarColor}
                src={avatarSrc(workshop.facilitator)}
                size={38}
              />
              <div>
                <Link
                  href={`/people/${workshop.facilitator.id}`}
                  className="text-[14px] font-semibold text-ink no-underline hover:text-brick"
                >
                  {workshop.facilitator.name}
                </Link>
                <div className="text-[12.5px] text-muted">
                  Facilitator
                  {workshop.facilitator.affiliation ? ` · ${workshop.facilitator.affiliation}` : ""}
                </div>
              </div>
              {canManage ? (
                <>
                  <div className="flex-1" />
                  <Link
                    href={`/workshops/${workshop.slug}/edit`}
                    className="border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 no-underline hover:border-brick hover:text-brick hover:no-underline"
                  >
                    Edit workshop
                  </Link>
                  <Link
                    href={`/workshops/${workshop.slug}?tab=roster`}
                    className="border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 no-underline hover:border-brick hover:text-brick hover:no-underline"
                  >
                    Roster
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          {liveBanner}

          <div className="flex gap-6 overflow-x-auto border-b border-line">
            {tabs.map(([key, label]) => {
              const active = tab === key;
              return (
                <Link
                  key={key}
                  href={`/workshops/${workshop.slug}?tab=${key}`}
                  scroll={false}
                  className="whitespace-nowrap px-0.5 pb-3 text-[14px] no-underline hover:no-underline"
                  style={{
                    fontWeight: active ? 600 : 400,
                    color: active ? "#211d16" : "#6e675a",
                    borderBottom: `2px solid ${active ? "#8a3325" : "transparent"}`,
                    marginBottom: -1,
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {tab === "overview" ? (
            <div className="flex flex-col gap-9">
              {workshop.about?.trim() ? (
                <div>
                  <SectionLabel>About</SectionLabel>
                  <Markdown>{workshop.about}</Markdown>
                </div>
              ) : null}

              {outcomes.length ? (
                <div>
                  <SectionLabel>What you&apos;ll learn</SectionLabel>
                  <div className="flex flex-col gap-2.5">
                    {outcomes.map((o) => (
                      <div key={o} className="flex items-baseline gap-3">
                        <div className="mt-0.5 h-1.5 w-1.5 shrink-0 bg-brick" />
                        <div className="text-[14.5px] leading-[1.55] text-ink-2">{o}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {workshop.prerequisites ? (
                <div>
                  <SectionLabel>Prerequisites</SectionLabel>
                  <p className="text-[14.5px] leading-[1.6] text-ink-2">{workshop.prerequisites}</p>
                </div>
              ) : null}

              <div>
                <SectionLabel>Sessions</SectionLabel>
                {canManage ? <SessionAdmin workshopId={workshop.id} /> : null}
                <div className="flex flex-col gap-2.5">
                  {workshop.sessions.length === 0 ? (
                    <EmptyState title="Sessions haven't been scheduled yet." />
                  ) : (
                    workshop.sessions.map((s) => {
                      const past = s.scheduledAt < new Date();
                      const attended = attendedSet.has(s.id);
                      return (
                        <Card key={s.id} className="flex flex-col gap-2 px-5 py-4">
                          <div className="flex items-center gap-4">
                            <div className="min-w-[26px] font-serif text-[18px] text-muted">
                              {s.index}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[14.5px] font-semibold">{s.title}</div>
                              <div className="mt-0.5 text-[12.5px] text-muted">
                                {dateTime(s.scheduledAt)} · {s.durationMin} min
                              </div>
                              {s.description ? (
                                <div className="mt-1 text-[13px] leading-[1.5] text-ink-4">
                                  {s.description}
                                </div>
                              ) : null}
                            </div>
                            {attended ? (
                              <Pill bg="#e4ecdb" fg="#3e5730">
                                Attended
                              </Pill>
                            ) : s.recordingUrl ? (
                              <Pill bg="#e8e3f0" fg="#4f4370">
                                Recorded
                              </Pill>
                            ) : past ? (
                              <Pill bg="#efe9dc" fg="#6e675a">
                                Past
                              </Pill>
                            ) : (
                              <Pill bg="#f2eee3" fg="#57503f">
                                Upcoming
                              </Pill>
                            )}
                          </div>

                          {isEnrolled ? (
                            <div className="flex flex-wrap gap-4 border-t border-line-soft pt-2.5 text-[13px]">
                              {s.meetingUrl && !past ? (
                                <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer">
                                  Join the live session
                                </a>
                              ) : null}
                              {s.recordingUrl ? (
                                <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer">
                                  Watch the recording
                                </a>
                              ) : null}
                              {s.resources.map((r) => (
                                <a
                                  key={r.id}
                                  href={r.url ?? "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {r.title}
                                </a>
                              ))}
                              {!s.meetingUrl && !s.recordingUrl && s.resources.length === 0 ? (
                                <span className="text-muted">
                                  Links and materials appear here before the session.
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {canManage ? (
                            <SessionManage
                              session={{
                                id: s.id,
                                title: s.title,
                                description: s.description,
                                scheduledAtISO: s.scheduledAt.toISOString(),
                                durationMin: s.durationMin,
                                meetingUrl: s.meetingUrl,
                                recordingUrl: s.recordingUrl,
                              }}
                            />
                          ) : null}
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <SectionLabel>Materials</SectionLabel>
                {canManage ? (
                  <Details label="+ Add material">
                    <form action={addResourceAction} className="flex flex-col gap-3.5">
                      <input type="hidden" name="workshopId" value={workshop.id} />
                      <div className="grid gap-3.5 sm:grid-cols-[1fr_140px]">
                        <Field label="Title" hint="optional — defaults to the file's name">
                          <input name="title" placeholder="Session 1 slides" />
                        </Field>
                        <Field label="Kind">
                          <select name="kind" defaultValue="AUTO">
                            <option value="AUTO">Detect from file</option>
                            {RESOURCE_KINDS.map((k) => (
                              <option key={k}>{k}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="Upload a file" hint="up to 25 MB">
                        <input type="file" name="file" />
                      </Field>
                      <Field label="…or link to it">
                        <input name="url" placeholder="https://…" />
                      </Field>
                      <Field label="Attach to a session" hint="optional">
                        <select name="sessionId" defaultValue="">
                          <option value="">— workshop-wide —</option>
                          {workshop.sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.index}. {s.title}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <input type="hidden" name="visibility" value="MEMBERS" />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                          style={{ color: "#faf8f3" }}
                        >
                          Add material
                        </button>
                      </div>
                    </form>
                  </Details>
                ) : null}

                <div className="flex flex-col gap-2.5">
                  {workshop.resources.length === 0 ? (
                    <EmptyState title="No materials posted yet." />
                  ) : (
                    workshop.resources.map((r) => {
                      const [bg, fg] = KIND_COLORS[r.kind] ?? KIND_COLORS.LINK;
                      const locked = !isEnrolled && !canManage && r.visibility !== "PUBLIC";
                      const editable = canManage || (!!user && r.uploadedById === user.id);
                      const card = (
                        <Card key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                          <KindBadge kind={r.kind} bg={bg} fg={fg} />
                          <div className="flex-1 text-[14.5px] font-semibold">{r.title}</div>
                          {locked ? (
                            <span className="text-[12.5px] text-muted">Enrol to access</span>
                          ) : r.filePath ? (
                            <span className="flex items-center gap-3">
                              {viewableKind(fileExt(r.filePath)) ? (
                                <a href={`/resources/${r.id}`} className="text-[13px] font-semibold">
                                  View
                                </a>
                              ) : null}
                              <a
                                href={`/api/resources/${r.id}/download`}
                                className="text-[13px] font-semibold text-ink-4"
                              >
                                Download
                              </a>
                            </span>
                          ) : r.url ? (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] font-semibold"
                            >
                              Open
                            </a>
                          ) : null}
                        </Card>
                      );
                      if (!editable) return card;
                      return (
                        <div key={r.id} className="flex flex-col">
                          {card}
                          <div className="border border-t-0 border-line-soft bg-sand/40 px-5 py-1.5">
                            <Details label="Edit details">
                              <ResourceEditForm resource={r} folders={null} />
                            </Details>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {workshop.announcements.length ? (
                <div>
                  <SectionLabel>Announcements</SectionLabel>
                  <div className="flex flex-col gap-2.5">
                    {workshop.announcements.map((a) => (
                      <Card key={a.id} className="px-5 py-4">
                        <div className="text-[14px] leading-[1.55] text-ink-2">{a.body}</div>
                        <div className="mt-1 text-[12px] text-muted">
                          {a.author.name} · {fullDate(a.createdAt)}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "assignments" ? (
            <AssignmentsTab
              workshopId={workshop.id}
              sessions={workshop.sessions.map((s) => ({ id: s.id, index: s.index, title: s.title }))}
              canManage={canManage}
              isEnrolled={isEnrolled}
              userId={user?.id ?? null}
            />
          ) : null}

          {tab === "roster" && canManage ? (
            <RosterTab
              workshopId={workshop.id}
              sessions={workshop.sessions.map((s) => ({
                id: s.id,
                index: s.index,
                title: s.title,
                meetingUrl: s.meetingUrl,
                recordingUrl: s.recordingUrl,
              }))}
              threshold={workshop.attendanceThreshold}
            />
          ) : null}
        </div>

        {isOverview ? (
        <aside className="flex flex-col gap-4.5 lg:sticky lg:top-[88px]">
          <EnrollPanel
            workshopId={workshop.id}
            slug={workshop.slug}
            startDate={fullDate(workshop.startDate)}
            status={myEnrollment?.status ?? null}
            signedIn={!!user}
            seatsLeft={Math.max(0, workshop.seats - taken)}
            certificateEnabled={workshop.certificateEnabled}
          />

          <Card className="p-6">
            <div className="mb-2 flex justify-between text-[12.5px] text-ink-4">
              <span>Seats</span>
              <span className="font-semibold text-ink">
                {taken} / {workshop.seats}
              </span>
            </div>
            <div className="h-1.5 bg-line-soft">
              <div
                className="h-1.5 bg-olive"
                style={{ width: `${Math.min(100, (taken / workshop.seats) * 100)}%` }}
              />
            </div>
            {waitlisted > 0 ? (
              <div className="mt-2 text-[12px] text-muted">{waitlisted} on the waitlist</div>
            ) : null}

            {isEnrolled && workshop.sessions.length > 0 ? (
              <div className="mt-5 border-t border-line-soft pt-4">
                <div className="mb-2 flex justify-between text-[12.5px] text-ink-4">
                  <span>Your progress</span>
                  <span className="font-semibold text-ink">
                    {attendedSet.size} / {workshop.sessions.length} sessions
                  </span>
                </div>
                <div className="h-1.5 bg-line-soft">
                  <div className="h-1.5 bg-brick" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="mt-2 text-[12px] text-muted">
                  {workshop.attendanceThreshold}% attendance earns a certificate.
                </div>
              </div>
            ) : null}

            {myCertificate ? (
              <div className="mt-5 border-t border-line-soft pt-4">
                <div className="text-[13px] font-semibold text-olive-dark">Certificate earned</div>
                <Link
                  href={`/verify/${myCertificate.code}`}
                  className="mt-1 block text-[12.5px] font-mono"
                >
                  {myCertificate.code}
                </Link>
              </div>
            ) : null}
          </Card>

          {workshop.supportsProjects.length ? (
            <Card className="p-6">
              <SectionLabel>Supports project</SectionLabel>
              {workshop.supportsProjects.map((p) => (
                <div key={p.slug} className="mb-2 last:mb-0">
                  <Link href={`/projects/${p.slug}`} className="text-[14.5px] font-semibold no-underline">
                    {p.title}
                  </Link>
                </div>
              ))}
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                Skills from this workshop feed directly into the project.
              </p>
            </Card>
          ) : null}
        </aside>
        ) : null}
      </div>
    </Shell>
  );
}
