import Link from "next/link";
import { db } from "@/lib/db";
import { avatarSrc, monthYear, parseList } from "@/lib/format";
import { CREDIT_ROLES, PROJECT_ROLES, CONTRIBUTION_TYPES } from "@/lib/enums";
import { ROLE_COLORS } from "@/lib/theme";
import { logContributionAction, removeMemberAction, updateMemberAction } from "@/actions/projects";
import { Avatar, Card, Field, Pill, SectionLabel } from "@/components/ui";
import { Details } from "@/components/Collapse";
import type { ProjectAccess } from "@/lib/permissions";

type Member = {
  id: string;
  userId: string;
  projectRole: string;
  pod: string | null;
  roleTitle: string | null;
  creditRoles: string;
  authorOrder: number | null;
  joinedAt: Date;
  user: { id: string; name: string; avatarColor: string; affiliation: string | null };
};

export async function TeamTab({
  project,
  access,
}: {
  project: { id: string; members: Member[] };
  access: ProjectAccess;
}) {
  const counts = await db.contribution.groupBy({
    by: ["userId"],
    where: { projectId: project.id },
    _count: { _all: true },
  });
  const countBy = new Map(counts.map((c) => [c.userId, c._count._all]));

  const authorList = project.members
    .filter((m) => parseList(m.creditRoles).length > 0)
    .sort((a, b) => (a.authorOrder ?? 99) - (b.authorOrder ?? 99));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Team</SectionLabel>
        <div className="grid gap-3.5 sm:grid-cols-2">
          {project.members.map((m) => {
            const [rbg, rfg] = ROLE_COLORS[m.projectRole] ?? ROLE_COLORS.CONTRIBUTOR;
            const credits = parseList(m.creditRoles);
            return (
              <Card key={m.id} className="flex flex-col gap-3 px-[18px] py-4">
                <div className="flex items-center gap-3.5">
                  <Avatar name={m.user.name} color={m.user.avatarColor} src={avatarSrc(m.user)} size={38} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/people/${m.user.id}`}
                      className="text-[14.5px] font-semibold text-ink no-underline hover:text-brick"
                    >
                      {m.user.name}
                    </Link>
                    <div className="text-[12.5px] text-muted">
                      {[m.roleTitle, m.pod].filter(Boolean).join(" · ") || "Contributor"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] text-ink-4">{countBy.get(m.userId) ?? 0}</div>
                    <div className="text-[11px] text-muted">contributions</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill bg={rbg} fg={rfg}>
                    {m.projectRole}
                  </Pill>
                  <span className="text-[11.5px] text-muted">
                    since {monthYear(m.joinedAt)}
                  </span>
                </div>

                {credits.length ? (
                  <div className="border-t border-line-soft pt-2.5">
                    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                      CRediT roles
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {credits.map((c) => (
                        <span key={c} className="bg-tint px-2 py-[3px] text-[11px] text-ink-3">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {access.canManage ? (
                  <details className="border-t border-line-soft pt-2.5">
                    <summary className="cursor-pointer text-[12px] font-semibold text-brick">
                      Edit role &amp; credit
                    </summary>
                    <form action={updateMemberAction} className="mt-3 flex flex-col gap-3">
                      <input type="hidden" name="memberId" value={m.id} />
                      <div className="grid grid-cols-2 gap-2.5">
                        <Field label="Project role">
                          <select name="projectRole" defaultValue={m.projectRole}>
                            {PROJECT_ROLES.map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Author order" hint="optional">
                          <input
                            name="authorOrder"
                            type="number"
                            min={1}
                            defaultValue={m.authorOrder ?? undefined}
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <Field label="Role title">
                          <input name="roleTitle" defaultValue={m.roleTitle ?? ""} />
                        </Field>
                        <Field label="Pod">
                          <input name="pod" defaultValue={m.pod ?? ""} placeholder="Data pod" />
                        </Field>
                      </div>
                      <div>
                        <label>CRediT contributor roles</label>
                        <div className="grid max-h-[190px] grid-cols-1 gap-1 overflow-y-auto border border-line-input bg-paper p-2.5 sm:grid-cols-2">
                          {CREDIT_ROLES.map((c) => (
                            <label
                              key={c}
                              className="flex cursor-pointer items-center gap-1.5 text-[11.5px] font-normal"
                            >
                              <input
                                type="checkbox"
                                name="creditRoles"
                                value={c}
                                defaultChecked={credits.includes(c)}
                                className="!w-auto"
                              />
                              {c}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="submit"
                          className="cursor-pointer border-none bg-brick px-4 py-2 text-[12.5px] font-semibold"
                          style={{ color: "#faf8f3" }}
                        >
                          Save
                        </button>
                      </div>
                    </form>
                    {m.projectRole !== "LEAD" ? (
                      <form action={removeMemberAction} className="mt-2">
                        <input type="hidden" name="memberId" value={m.id} />
                        <button
                          type="submit"
                          className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-muted hover:text-brick"
                        >
                          Remove from project
                        </button>
                      </form>
                    ) : null}
                  </details>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>

      {/* The whole point: turn contribution into transparent authorship. */}
      <div>
        <SectionLabel>Provisional author line</SectionLabel>
        <Card className="px-5 py-4">
          <p className="text-[14px] leading-[1.6] text-ink-2">
            {authorList.length
              ? authorList.map((m) => m.user.name).join(", ")
              : "No CRediT roles assigned yet — the author line is generated from them."}
          </p>
          <p className="mt-2.5 border-t border-line-soft pt-2.5 text-[12.5px] leading-relaxed text-ink-4">
            Authorship here follows the{" "}
            <a href="https://credit.niso.org/" target="_blank" rel="noopener noreferrer">
              CRediT taxonomy
            </a>
            . Every contributor can see who is credited for what, and in which order, before anything
            is submitted anywhere.
          </p>
        </Card>
      </div>

      {access.canManage ? (
        <div>
          <SectionLabel>Log a contribution</SectionLabel>
          <Details label="+ Credit someone's work">
            <form action={logContributionAction} className="flex flex-col gap-3.5">
              <input type="hidden" name="projectId" value={project.id} />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Contributor">
                  <select name="userId" required>
                    {project.members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Type">
                  <select name="type" defaultValue="DATA">
                    {CONTRIBUTION_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="What did they do?">
                <input
                  name="text"
                  required
                  placeholder="Cleaned station metadata and flagged missing-value issues"
                />
              </Field>
              <Field label="CRediT role" hint="optional">
                <select name="creditRole" defaultValue="">
                  <option value="">— none —</option>
                  {CREDIT_ROLES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                  style={{ color: "#faf8f3" }}
                >
                  Log contribution
                </button>
              </div>
            </form>
          </Details>
        </div>
      ) : null}
    </div>
  );
}
