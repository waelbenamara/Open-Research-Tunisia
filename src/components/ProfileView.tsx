import Link from "next/link";
import { db } from "@/lib/db";
import { avatarSrc, fullDate, monthYear, parseList, shortDate } from "@/lib/format";
import { CONTRIB_TAG_COLORS, statusPill } from "@/lib/theme";
import { Avatar, Card, EmptyState, Pill, SectionLabel } from "@/components/ui";

/**
 * The public researcher record. This is the thing a contributor can put on a CV:
 * what they did, who credited them, and which credentials verify.
 */
export async function ProfileView({
  userId,
  isOwner,
  viewerId = null,
}: {
  userId: string;
  isOwner: boolean;
  viewerId?: string | null;
}) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        // Public profiles only surface projects that have cleared review.
        where: { project: { approvalStatus: "APPROVED" } },
        include: {
          project: { select: { slug: true, title: true, stage: true, area: true } },
        },
        orderBy: { joinedAt: "desc" },
      },
      contributions: {
        include: {
          project: { select: { slug: true, title: true } },
          workshop: { select: { slug: true, title: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: 60,
      },
      certificates: {
        include: { workshop: { select: { slug: true, title: true, facilitator: { select: { name: true } } } } },
        orderBy: { issuedAt: "desc" },
      },
      enrollments: {
        include: { workshop: { select: { slug: true, title: true, startDate: true, sessions: { select: { id: true } } } } },
        orderBy: { enrolledAt: "desc" },
      },
      applications: {
        include: { project: { select: { slug: true, title: true } } },
        orderBy: { createdAt: "desc" },
      },
      ledProjects: {
        where: { approvalStatus: "APPROVED" },
        select: { slug: true, title: true, stage: true },
      },
    },
  });
  if (!user) return null;

  const skills = parseList(user.skills);
  const languages = parseList(user.languages);

  // Every distinct CRediT role this person has earned, across all projects.
  const allCredit = new Set<string>();
  for (const m of user.memberships) parseList(m.creditRoles).forEach((c) => allCredit.add(c));

  const activeEnrollments = user.enrollments.filter((e) =>
    ["ENROLLED", "COMPLETED"].includes(e.status),
  );

  return (
    <>
      <div className="mb-9 flex flex-wrap items-center gap-6 border-b border-line pb-8">
        <Avatar name={user.name} color={user.avatarColor} src={avatarSrc(user)} size={76} />
        <div className="min-w-[240px] flex-1">
          <h1 className="font-serif text-[30px] font-medium">{user.name}</h1>
          <div className="mt-1 text-[14px] text-ink-4">
            {[
              user.role === "ADMIN"
                ? "Administrator"
                : user.canPostProjects
                  ? "Project lead"
                  : "Contributor",
              `since ${monthYear(user.createdAt)}`,
              user.city,
              user.headline,
              user.affiliation,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {user.bio ? (
            <p className="mt-2.5 max-w-[60ch] text-[14px] leading-relaxed text-ink-3 pretty">
              {user.bio}
            </p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="bg-tint px-2.5 py-[3px] text-[11.5px] text-ink-3">
                {s}
              </span>
            ))}
            {languages.length ? (
              <span className="px-1 text-[11.5px] text-muted">· speaks {languages.join(", ")}</span>
            ) : null}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-4 text-[12.5px]">
            {user.orcid ? (
              <a href={`https://orcid.org/${user.orcid}`} target="_blank" rel="noopener noreferrer">
                ORCID {user.orcid}
              </a>
            ) : null}
            {user.website ? (
              <a href={user.website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            ) : null}
            {user.scholar ? (
              <a href={user.scholar} target="_blank" rel="noopener noreferrer">
                Google Scholar
              </a>
            ) : null}
            {user.github ? (
              <a href={user.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            ) : null}
            {viewerId ? (
              <a href={`mailto:${user.email}`} className="font-medium text-brick">
                {user.email}
              </a>
            ) : null}
            {isOwner ? (
              <Link href="/profile/edit">Edit profile</Link>
            ) : viewerId ? (
              <Link
                href={`/messages/${userId}`}
                className="border border-line-input bg-card px-3.5 py-1 font-semibold text-ink-4 no-underline hover:border-brick hover:text-brick hover:no-underline"
              >
                Message
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex gap-7 text-center">
          <div>
            <div className="font-serif text-[28px]">{user.contributions.length}</div>
            <div className="text-[12px] text-muted">Contributions</div>
          </div>
          <div>
            <div className="font-serif text-[28px]">{user.certificates.length}</div>
            <div className="text-[12px] text-muted">Certificates</div>
          </div>
          <div>
            <div className="font-serif text-[28px]">{user.memberships.length}</div>
            <div className="text-[12px] text-muted">Projects</div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-9">
          <section>
            <SectionLabel>Projects</SectionLabel>
            {user.memberships.length === 0 ? (
              <EmptyState
                title="Not on a project yet."
                hint={
                  isOwner ? (
                    <>
                      <Link href="/?filter=recruiting">Browse what&apos;s recruiting</Link> — several
                      projects take contributors with no research background.
                    </>
                  ) : undefined
                }
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                {user.memberships.map((m) => {
                  const credits = parseList(m.creditRoles);
                  return (
                    <Card key={m.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <Link
                          href={`/projects/${m.project.slug}`}
                          className="text-[14.5px] font-semibold no-underline"
                        >
                          {m.project.title}
                        </Link>
                        <div className="flex-1" />
                        <span className="text-[12px] text-muted">
                          {m.roleTitle ?? m.projectRole} · since {monthYear(m.joinedAt)}
                        </span>
                      </div>
                      {credits.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {credits.map((c) => (
                            <span key={c} className="bg-tint px-2 py-[3px] text-[11px] text-ink-3">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>Contribution log</SectionLabel>
            {user.contributions.length === 0 ? (
              <EmptyState title="Nothing logged yet." />
            ) : (
              <div className="flex flex-col">
                {user.contributions.map((c) => {
                  const [bg, fg] = CONTRIB_TAG_COLORS[c.type] ?? CONTRIB_TAG_COLORS.DATA;
                  return (
                    <div
                      key={c.id}
                      className="flex items-baseline gap-4 border-b border-line-soft py-3.5"
                    >
                      <div className="min-w-[56px] text-[12px] font-semibold text-muted">
                        {shortDate(c.occurredAt)}
                      </div>
                      <div className="flex-1">
                        <div className="text-[14px] leading-[1.5] text-ink-2">{c.text}</div>
                        {c.project || c.workshop ? (
                          <Link
                            href={
                              c.project
                                ? `/projects/${c.project.slug}`
                                : `/workshops/${c.workshop!.slug}`
                            }
                            className="text-[12px] text-muted no-underline hover:text-brick"
                          >
                            {c.project?.title ?? c.workshop?.title}
                          </Link>
                        ) : null}
                      </div>
                      <span
                        className="px-2 py-[2px] text-[11px] font-semibold"
                        style={{ background: bg, color: fg }}
                      >
                        {c.creditRole ?? c.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {isOwner ? (
            <section>
              <SectionLabel>My applications</SectionLabel>
              {user.applications.length === 0 ? (
                <EmptyState
                  title="No applications yet."
                  hint={<Link href="/?filter=recruiting">Browse projects</Link>}
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {user.applications.map((a) => {
                    const p = statusPill(a.status);
                    return (
                      <Card key={a.id} className="flex items-center gap-3.5 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/projects/${a.project.slug}`}
                            className="text-[14.5px] font-semibold no-underline"
                          >
                            {a.project.title}
                          </Link>
                          <div className="mt-0.5 text-[12.5px] text-muted">
                            Applied {fullDate(a.createdAt)} · {a.roleApplied}
                          </div>
                          {a.decisionNote ? (
                            <div className="mt-1 text-[12.5px] text-ink-4">{a.decisionNote}</div>
                          ) : null}
                        </div>
                        <Pill bg={p.bg} fg={p.fg}>
                          {p.label}
                        </Pill>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-9">
          {allCredit.size > 0 ? (
            <section>
              <SectionLabel>CRediT roles earned</SectionLabel>
              <Card className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {[...allCredit].map((c) => (
                    <span key={c} className="bg-brick-tint px-2.5 py-1 text-[11.5px] text-brick">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="mt-2.5 border-t border-line-soft pt-2.5 text-[12px] leading-relaxed text-muted">
                  Standard contributor roles recognised by journals — earned across{" "}
                  {user.memberships.length} project{user.memberships.length === 1 ? "" : "s"}.
                </p>
              </Card>
            </section>
          ) : null}

          <section>
            <SectionLabel>Certificates</SectionLabel>
            {user.certificates.length === 0 ? (
              <EmptyState title="No certificates yet." />
            ) : (
              <div className="flex flex-col gap-3">
                {user.certificates.map((c) => (
                  <Card key={c.id} className="border-t-[3px] border-t-brick px-[22px] py-5">
                    <div className="font-serif text-[17px] font-medium">{c.title}</div>
                    <div className="mt-1 text-[12.5px] text-muted">
                      Issued {monthYear(c.issuedAt)} · facilitated by{" "}
                      {c.workshop.facilitator.name}
                    </div>
                    <Link
                      href={`/verify/${c.code}`}
                      className="mt-2.5 inline-block text-[13px] font-semibold"
                    >
                      Verify · {c.code}
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>Workshops</SectionLabel>
            {activeEnrollments.length === 0 ? (
              <EmptyState title="Not enrolled in any workshop yet." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {activeEnrollments.map((e) => (
                  <Card key={e.id} className="px-5 py-4">
                    <Link
                      href={`/workshops/${e.workshop.slug}`}
                      className="text-[14.5px] font-semibold no-underline"
                    >
                      {e.workshop.title}
                    </Link>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {e.status === "COMPLETED" ? "Completed" : "Starts"}{" "}
                      {e.status === "COMPLETED" && e.completedAt
                        ? monthYear(e.completedAt)
                        : fullDate(e.workshop.startDate)}{" "}
                      · {e.workshop.sessions.length} sessions
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {user.ledProjects.length ? (
            <section>
              <SectionLabel>Leads</SectionLabel>
              <div className="flex flex-col gap-2">
                {user.ledProjects.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/projects/${p.slug}`}
                    className="text-[13.5px] font-semibold no-underline"
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
