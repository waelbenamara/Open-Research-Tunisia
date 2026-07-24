import Link from "next/link";
import { db, ilike } from "@/lib/db";
import { avatarSrc, monthYear, parseList } from "@/lib/format";
import { ROLE_COLORS } from "@/lib/theme";
import { Avatar, Card, EmptyState, Pill, Shell } from "@/components/ui";

export const metadata = {
  title: "People",
  description: "Everyone contributing to Open Research Tunisia.",
};

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; skill?: string }>;
}) {
  const { q = "", skill = "" } = await searchParams;
  const term = q.trim();

  const users = await db.user.findMany({
    where: {
      suspended: false,
      ...(term
        ? {
            OR: [
              { name: ilike(term) },
              { affiliation: ilike(term) },
              { headline: ilike(term) },
              { skills: ilike(term) },
            ],
          }
        : {}),
      ...(skill ? { skills: ilike(skill) } : {}),
    },
    include: {
      _count: { select: { contributions: true, memberships: true, certificates: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    take: 200,
  });

  // Skill cloud, built from what people actually listed.
  const skillCounts = new Map<string, number>();
  for (const u of users) {
    for (const s of parseList(u.skills)) skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1);
  }
  const topSkills = [...skillCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);

  return (
    <Shell className="pb-24 pt-11">
      <h1 className="font-serif text-[32px] font-medium">People</h1>
      <p className="mb-7 mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-3 pretty">
        Project leads use this directory to find contributors with the right skills. If you want to
        be found, list yours on your profile.
      </p>

      {topSkills.length ? (
        <div className="mb-7 flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="text-muted">Filter by skill:</span>
          <Link
            href="/people"
            className="no-underline hover:no-underline"
            style={{ color: skill ? "#6e675a" : "#211d16", fontWeight: skill ? 400 : 600 }}
          >
            All
          </Link>
          {topSkills.map(([s, n]) => (
            <Link
              key={s}
              href={`/people?skill=${encodeURIComponent(s)}`}
              className="bg-tint px-2.5 py-1 no-underline hover:no-underline"
              style={{
                color: skill === s ? "#8a3325" : "#57503f",
                fontWeight: skill === s ? 600 : 400,
              }}
            >
              {s} <span className="text-muted">{n}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {users.length === 0 ? (
        <EmptyState title="Nobody matches that." />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const [rbg, rfg] =
              ROLE_COLORS[u.role === "ADMIN" ? "ADMIN" : u.canPostProjects ? "LEAD" : "MEMBER"];
            return (
              <Card key={u.id} hover className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-3.5">
                  <Avatar name={u.name} color={u.avatarColor} src={avatarSrc(u)} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/people/${u.id}`}
                      className="text-[14.5px] font-semibold text-ink no-underline hover:text-brick"
                    >
                      {u.name}
                    </Link>
                    <div className="truncate text-[12.5px] text-muted">
                      {u.headline ?? u.affiliation ?? `Member since ${monthYear(u.createdAt)}`}
                    </div>
                  </div>
                  <Pill bg={rbg} fg={rfg}>
                    {u.role === "ADMIN" ? "Admin" : u.canPostProjects ? "Lead" : "Member"}
                  </Pill>
                </div>
                <div className="flex flex-wrap gap-1">
                  {parseList(u.skills).slice(0, 5).map((s) => (
                    <span key={s} className="bg-tint px-2 py-[3px] text-[11px] text-ink-3">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex gap-4 border-t border-line-soft pt-2.5 text-[12px] text-muted">
                  <span>{u._count.contributions} contributions</span>
                  <span>{u._count.memberships} projects</span>
                  <span>{u._count.certificates} certificates</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
