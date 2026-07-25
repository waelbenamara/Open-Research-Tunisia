import Link from "next/link";
import { db } from "@/lib/db";
import { fullDate } from "@/lib/format";
import { Card, EmptyState, Pill, Shell, StatCard } from "@/components/ui";

export const metadata = {
  title: "Publications",
  description: "Everything Open Research Tunisia has produced — papers, preprints, datasets and code.",
};

const TYPE_LABEL: Record<string, string> = {
  PREPRINT: "Preprint",
  PAPER: "Journal paper",
  DATASET: "Dataset",
  CODE: "Code",
  POLICY_BRIEF: "Policy brief",
  POSTER: "Poster",
  REPORT: "Report",
};

const STATUS_PILL: Record<string, [string, string]> = {
  DRAFT: ["#efe9dc", "#6e675a"],
  UNDER_REVIEW: ["#f4ead2", "#7a5b16"],
  PUBLISHED: ["#8a3325", "#faf8f3"],
};

export default async function PublicationsPage() {
  const outputs = await db.output.findMany({
    where: { project: { approvalStatus: "APPROVED", archived: false } },
    include: { project: { select: { slug: true, title: true, area: true } } },
    orderBy: [{ status: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });

  const published = outputs.filter((o) => o.status === "PUBLISHED");
  const inProgress = outputs.filter((o) => o.status !== "PUBLISHED");

  const datasets = outputs.filter((o) => o.type === "DATASET").length;
  const openAccess = outputs.filter((o) => o.license.startsWith("CC")).length;

  return (
    <Shell className="pb-24 pt-11">
      <h1 className="font-serif text-[32px] font-medium">Publications &amp; outputs</h1>
      <p className="mb-8 mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-3 pretty">
        Everything the initiative has produced. Papers are only part of it — datasets, code and
        policy briefs are outputs too, and every one carries the full contributor list.
      </p>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard n={published.length} label="Published outputs" />
        <StatCard n={inProgress.length} label="In the pipeline" />
        <StatCard n={datasets} label="Open datasets" />
        <StatCard n={openAccess} label="Under a Creative Commons licence" />
      </div>

      {outputs.length === 0 ? (
        <EmptyState
          title="No outputs recorded yet."
          hint="Project leads record outputs from a project's Outputs tab."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {[
            ["Published", published],
            ["In progress", inProgress],
          ].map(([label, list]) => {
            const items = list as typeof outputs;
            if (items.length === 0) return null;
            return (
              <section key={label as string}>
                <div className="eyebrow mb-3">{label as string}</div>
                <div className="flex flex-col gap-3">
                  {items.map((o) => {
                    const [bg, fg] = STATUS_PILL[o.status] ?? STATUS_PILL.DRAFT;
                    return (
                      <Card
                        key={o.id}
                        className="border-t-[3px] border-t-brick px-[22px] py-5"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brick">
                            {TYPE_LABEL[o.type] ?? o.type}
                          </span>
                          <span className="text-[12px] text-muted">· {o.project.area}</span>
                          <div className="flex-1" />
                          <Pill bg={bg} fg={fg}>
                            {o.status.replace("_", " ").toLowerCase()}
                          </Pill>
                        </div>
                        <div className="font-serif text-[21px] font-medium leading-snug balance">
                          {o.title}
                        </div>
                        {o.authorsLine ? (
                          <div className="mt-1.5 text-[13.5px] text-ink-3">{o.authorsLine}</div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
                          <Link href={`/projects/${o.project.slug}`}>{o.project.title}</Link>
                          {o.venue ? <span>{o.venue}</span> : null}
                          {o.publishedAt ? <span>{fullDate(o.publishedAt)}</span> : null}
                          <span>{o.license}</span>
                          {o.doi ? <span>DOI {o.doi}</span> : null}
                          {o.url ? (
                            <a
                              href={o.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold"
                            >
                              Read it
                            </a>
                          ) : null}
                          {o.filePath ? (
                            <a href={`/api/outputs/${o.id}/file`} className="font-semibold">
                              Archived copy
                            </a>
                          ) : null}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
