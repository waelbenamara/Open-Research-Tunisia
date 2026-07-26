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

  const [projects, workshops, areas] = await Promise.all([
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
    db.project.findMany({
      where: { archived: false, approvalStatus: "APPROVED" },
      select: { area: true },
      distinct: ["area"],
      orderBy: { area: "asc" },
    }),
  ]);

  type CardItem = {
    key: string;
    href: string;
    kind: "project" | "workshop";
    typeLabel: string;
    typeColor: string;
    typeTint: string;
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
      kind: "project",
      typeLabel: "Project",
      typeColor: "#8a3325",
      typeTint: "#f7ece8",
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
      kind: "workshop",
      typeLabel: "Workshop",
      typeColor: "#4d6b3c",
      typeTint: "#e4ecdb",
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

  // The promise of the platform, not its (young) numbers.
  const heroPillars = [
    {
      title: "Contribute to real research",
      body: "Projects post real open roles and anyone can apply — motivation counts more than credentials.",
    },
    {
      title: "Learn the craft by doing",
      body: "Free, live, recorded workshops, each teaching the skills a recruiting project actually needs.",
    },
    {
      title: "Own a public record of your work",
      body: "Every contribution is logged in the credit taxonomy journals use — authorship you can point to.",
    },
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
        <div className="grid items-center gap-14 border-b border-line pb-14 pt-16 md:grid-cols-[1.45fr_1fr]">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-[9px] w-[9px] bg-brick" aria-hidden />
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brick">
                An open initiative · Tunisia
              </span>
            </div>
            <h1 className="font-serif text-[54px] font-medium leading-[1.06] balance">
              Research shouldn&apos;t require permission.
            </h1>
            <p className="max-w-[52ch] text-[17px] leading-[1.65] text-ink-3 pretty">
              Join real research projects as a contributor — no title, no affiliation, no
              gatekeeper. Learn the craft in hands-on workshops and build a public, verifiable
              record of the work you do.
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
          <div className="flex flex-col gap-6 border-l border-line pl-9">
            {heroPillars.map((p, i) => (
              <div key={p.title} className="flex gap-4">
                <div className="font-serif text-[26px] font-medium leading-none text-brick" aria-hidden>
                  {i + 1}
                </div>
                <div>
                  <div className="text-[14.5px] font-semibold leading-snug">{p.title}</div>
                  <p className="mt-1 text-[13px] leading-[1.6] text-ink-4 pretty">{p.body}</p>
                </div>
              </div>
            ))}
            <div className="mt-1 text-[12.5px] text-muted">
              How it works, in full — <Link href="/about">about the initiative</Link>.
            </div>
          </div>
        </div>
      ) : null}

      {/* Listing toolbar — title, create actions, search */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 pt-9">
        <div>
          <h2 className="font-serif text-[26px] font-medium leading-tight">Discover</h2>
          <p className="mt-0.5 text-[13.5px] text-ink-4">
            {cards.length} {cards.length === 1 ? "listing" : "listings"} · research projects to join
            and workshops to learn from
          </p>
        </div>
        {canCreateProject(user) ? (
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/projects/new"
              className="bg-brick px-4 py-2.5 text-[13px] font-semibold no-underline hover:bg-brick-dark hover:no-underline"
              style={{ color: "#faf8f3" }}
            >
              + New project
            </Link>
            <Link
              href="/workshops/new"
              className="border border-olive bg-card px-4 py-2.5 text-[13px] font-semibold text-olive no-underline hover:bg-olive-tint hover:no-underline"
            >
              + New workshop
            </Link>
          </div>
        ) : user ? (
          <Link
            href="/request-posting-rights"
            className="border border-line-input bg-card px-4 py-2.5 text-[13px] font-semibold text-ink-4 no-underline hover:border-brick hover:text-brick hover:no-underline"
          >
            Want to post a project?
          </Link>
        ) : (
          <Link
            href="/register"
            className="bg-brick px-4 py-2.5 text-[13px] font-semibold no-underline hover:bg-brick-dark hover:no-underline"
            style={{ color: "#faf8f3" }}
          >
            Join the initiative
          </Link>
        )}
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2.5 pb-6 pt-5">
        {FILTERS.map(([key, label]) => {
          const active = filter === key;
          return (
            <Link
              key={key}
              href={qs({ filter: key })}
              className="border px-4 py-2 text-[13px] font-medium no-underline hover:no-underline"
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
              <Card
                hover
                className="flex h-full cursor-pointer flex-col gap-3 border-t-[3px] p-6 pt-5"
                style={{ borderTopColor: c.typeColor }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.08em]"
                    style={{ background: c.typeTint, color: c.typeColor }}
                  >
                    {c.typeLabel}
                  </span>
                  <div className="flex-1" />
                  <Pill bg={c.stageBg} fg={c.stageFg}>
                    {c.stage}
                  </Pill>
                </div>
                <div className="font-serif text-[20px] font-medium leading-[1.25] text-ink balance">
                  {c.title}
                </div>
                <div className="text-[13.5px] leading-[1.55] text-ink-4 pretty line-clamp-3">
                  {c.summary}
                </div>
                <div className="flex-1" />
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.slice(0, 3).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-line-soft pt-3 text-[12.5px] text-ink-4">
                  <span className="truncate font-semibold text-ink">{c.metaL}</span>
                  <div className="flex-1" />
                  <span className="shrink-0" style={{ color: c.recruiting ? c.typeColor : undefined }}>
                    {c.recruiting && c.kind === "project" ? "● " : ""}
                    {c.metaR}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
