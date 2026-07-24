import Link from "next/link";
import { db, ilike } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canCreateProject } from "@/lib/permissions";
import { fullDate, parseList } from "@/lib/format";
import { stagePill } from "@/lib/theme";
import { Card, LinkButton, Pill, Shell, Tag, EmptyState } from "@/components/ui";
import { SearchBar } from "@/components/SearchBar";

type Search = {
  filter?: string;
  q?: string;
  area?: string;
};

const FILTERS = [
  ["all", "All"],
  ["research", "Research projects"],
  ["workshops", "Workshops"],
  ["recruiting", "Now recruiting"],
] as const;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { filter = "all", q = "", area = "" } = await searchParams;
  const user = await getCurrentUser();

  const term = q.trim();
  const projectWhere = {
    isPublic: true,
    archived: false,
    approvalStatus: "APPROVED",
    ...(area ? { area } : {}),
    ...(term
      ? {
          OR: [
            { title: ilike(term) },
            { summary: ilike(term) },
            { about: ilike(term) },
            { tags: ilike(term) },
            { area: ilike(term) },
          ],
        }
      : {}),
  };

  const [projects, workshops, counts, areas] = await Promise.all([
    filter === "workshops"
      ? []
      : db.project.findMany({
          where: projectWhere,
          include: {
            lead: { select: { name: true } },
            openings: { where: { isOpen: true }, select: { id: true } },
          },
          orderBy: { startedAt: "desc" },
        }),
    filter === "research"
      ? []
      : db.workshop.findMany({
          where: {
            status: { not: "DRAFT" },
            ...(term
              ? { OR: [{ title: ilike(term) }, { summary: ilike(term) }] }
              : {}),
          },
          include: {
            facilitator: { select: { name: true } },
            sessions: { select: { id: true } },
            enrollments: { where: { status: { in: ["ENROLLED", "COMPLETED"] } }, select: { id: true } },
          },
          orderBy: { startDate: "asc" },
        }),
    Promise.all([
      db.project.count({ where: { archived: false, isPublic: true, approvalStatus: "APPROVED" } }),
      db.workshop.count({ where: { status: { in: ["OPEN", "RUNNING"] } } }),
      db.user.count(),
      db.output.count({ where: { status: "PUBLISHED" } }),
    ]),
    db.project.findMany({
      where: { archived: false, approvalStatus: "APPROVED" },
      select: { area: true },
      distinct: ["area"],
      orderBy: { area: "asc" },
    }),
  ]);

  const [projectCount, workshopCount, memberCount, publishedCount] = counts;

  type CardItem = {
    key: string;
    href: string;
    typeLabel: string;
    typeColor: string;
    stage: string;
    stageBg: string;
    stageFg: string;
    title: string;
    summary: string;
    tags: string[];
    metaL: string;
    metaR: string;
    recruiting: boolean;
    sortKey: number;
  };

  const projectCards: CardItem[] = projects.map((p) => {
    const pill = stagePill(p.stage);
    return {
      key: p.id,
      href: `/projects/${p.slug}`,
      typeLabel: "Research project",
      typeColor: "#8a3325",
      stage: p.stage,
      stageBg: pill.bg,
      stageFg: pill.fg,
      title: p.title,
      summary: p.summary,
      tags: parseList(p.tags),
      metaL: p.lead.name,
      metaR: `${p.openings.length} open role${p.openings.length === 1 ? "" : "s"}`,
      recruiting: p.openings.length > 0 && ["Proposal", "Recruiting", "Active"].includes(p.stage),
      sortKey: p.startedAt.getTime(),
    };
  });

  const workshopCards: CardItem[] = workshops.map((w) => {
    const taken = w.enrollments.length;
    return {
      key: w.id,
      href: `/workshops/${w.slug}`,
      typeLabel: "Workshop",
      typeColor: "#4d6b3c",
      stage: w.level,
      stageBg: "#f2eee3",
      stageFg: "#57503f",
      title: w.title,
      summary: w.summary,
      tags: [`${w.sessions.length} sessions`, w.certificateEnabled ? "Certificate" : w.format],
      metaL: w.facilitator.name,
      metaR: `Starts ${fullDate(w.startDate)}`,
      recruiting: taken < w.seats && w.status === "OPEN",
      sortKey: w.startDate.getTime(),
    };
  });

  let cards = [...projectCards, ...workshopCards].sort((a, b) => b.sortKey - a.sortKey);
  if (filter === "recruiting") cards = cards.filter((c) => c.recruiting);

  const showHero = !term && filter === "all" && !area;

  const heroStats = [
    { n: projectCount, label: "Open research projects" },
    { n: workshopCount, label: "Upcoming workshops" },
    { n: memberCount, label: "Contributors and counting" },
    { n: publishedCount, label: "Published outputs" },
  ];

  const qs = (patch: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged = { filter, q: term, area, ...patch };
    if (merged.filter && merged.filter !== "all") next.set("filter", merged.filter);
    if (merged.q) next.set("q", merged.q);
    if (merged.area) next.set("area", merged.area);
    const s = next.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <Shell className="pb-24">
      {showHero ? (
        <div className="grid items-end gap-15 border-b border-line pb-12 pt-16 md:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-5">
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brick">
              An open initiative · Est. 2026
            </div>
            <h1 className="font-serif text-[52px] font-medium leading-[1.08] balance">
              Research, open to everyone in Tunisia.
            </h1>
            <p className="max-w-[52ch] text-[17px] leading-[1.65] text-ink-3 pretty">
              Join real research projects as a contributor — no title required. Learn the craft
              through hands-on workshops, build a public record of your work, and help publish
              research that matters.
            </p>
            {!user ? (
              <div className="mt-1 flex gap-3">
                <LinkButton href="/register">Join the initiative</LinkButton>
                <LinkButton href="/about" variant="ghost">
                  How it works
                </LinkButton>
              </div>
            ) : canCreateProject(user) ? (
              <div className="mt-1 flex gap-3">
                <LinkButton href="/projects/new">Post a project</LinkButton>
                <LinkButton href="/dashboard" variant="ghost">
                  My work
                </LinkButton>
              </div>
            ) : (
              <div className="mt-1 flex gap-3">
                <LinkButton href={qs({ filter: "recruiting" })}>See what&apos;s recruiting</LinkButton>
                <LinkButton href="/request-posting-rights" variant="ghost">
                  Request posting rights
                </LinkButton>
              </div>
            )}
          </div>
          <div className="flex flex-col border-l border-line pl-9">
            {heroStats.map((s) => (
              <div
                key={s.label}
                className="flex items-baseline gap-3 border-b border-line-soft py-3"
              >
                <div className="min-w-[64px] font-serif text-[34px] font-medium">{s.n}</div>
                <div className="text-[13px] text-ink-4">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5 pb-6 pt-7">
        {FILTERS.map(([key, label]) => {
          const active = filter === key;
          return (
            <Link
              key={key}
              href={qs({ filter: key })}
              className="rounded-full border px-4 py-2 text-[13px] font-medium no-underline hover:no-underline"
              style={{
                borderColor: active ? "#211d16" : "#ddd5c4",
                background: active ? "#211d16" : "#fffefb",
                color: active ? "#faf8f3" : "#57503f",
              }}
            >
              {label}
            </Link>
          );
        })}

        <div className="flex-1" />
        <SearchBar defaultValue={term} filter={filter} area={area} />
        <div className="text-[13px] text-muted">{cards.length} listings</div>
      </div>

      {areas.length > 1 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="text-muted">Areas:</span>
          <Link
            href={qs({ area: "" })}
            className="no-underline hover:no-underline"
            style={{ color: area ? "#6e675a" : "#211d16", fontWeight: area ? 400 : 600 }}
          >
            All
          </Link>
          {areas.map((a) => (
            <Link
              key={a.area}
              href={qs({ area: a.area })}
              className="no-underline hover:no-underline"
              style={{
                color: area === a.area ? "#211d16" : "#6e675a",
                fontWeight: area === a.area ? 600 : 400,
              }}
            >
              · {a.area}
            </Link>
          ))}
        </div>
      ) : null}

      {cards.length === 0 ? (
        <EmptyState
          title="Nothing matches that yet."
          hint={
            <>
              Try a different filter, or <Link href="/">clear the search</Link>.
            </>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.key} href={c.href} className="no-underline hover:no-underline">
              <Card hover className="flex h-full cursor-pointer flex-col gap-3.5 p-6">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: c.typeColor }}
                  >
                    {c.typeLabel}
                  </span>
                  <div className="flex-1" />
                  <Pill bg={c.stageBg} fg={c.stageFg}>
                    {c.stage}
                  </Pill>
                </div>
                <div className="font-serif text-[21px] font-medium leading-[1.25] text-ink balance">
                  {c.title}
                </div>
                <div className="text-[13.5px] leading-[1.55] text-ink-4 pretty">{c.summary}</div>
                <div className="flex-1" />
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.slice(0, 3).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-line-soft pt-3 text-[12.5px] text-ink-4">
                  <span className="font-semibold text-ink">{c.metaL}</span>
                  <div className="flex-1" />
                  <span>{c.metaR}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
