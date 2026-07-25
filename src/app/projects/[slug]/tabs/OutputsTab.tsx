import { fullDate } from "@/lib/format";
import { LICENSES, OUTPUT_STATUSES, OUTPUT_TYPES } from "@/lib/enums";
import { addOutputAction } from "@/actions/projects";
import { Card, EmptyState, Field, Pill } from "@/components/ui";
import { Details } from "@/components/Collapse";
import type { ProjectAccess } from "@/lib/permissions";

type Output = {
  id: string;
  title: string;
  type: string;
  url: string | null;
  doi: string | null;
  filePath: string | null;
  license: string;
  venue: string | null;
  authorsLine: string;
  status: string;
  publishedAt: Date | null;
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

export function OutputsTab({
  projectId,
  outputs,
  access,
}: {
  projectId: string;
  outputs: Output[];
  access: ProjectAccess;
}) {
  return (
    <div className="flex flex-col gap-3">
      {access.canManage ? (
        <Details label="+ Record an output">
          <form action={addOutputAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="projectId" value={projectId} />
            <Field label="Title">
              <input name="title" required placeholder="Seasonal water-stress forecasting in the Medjerda basin" />
            </Field>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Type">
                <select name="type" defaultValue="PREPRINT">
                  {OUTPUT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select name="status" defaultValue="DRAFT">
                  {OUTPUT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ").toLowerCase()}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="License">
                <select name="license" defaultValue="CC-BY-4.0">
                  {LICENSES.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Link">
                <input name="url" placeholder="https://…" />
              </Field>
              <Field label="DOI" hint="optional">
                <input name="doi" placeholder="10.5281/zenodo…" />
              </Field>
              <Field label="Venue" hint="optional">
                <input name="venue" placeholder="PLOS Water" />
              </Field>
            </div>
            <Field label="Published on" hint="optional">
              <input name="publishedAt" type="date" />
            </Field>
            <Field
              label="Archive a copy"
              hint="optional but wise — /publications shouldn't depend on external links staying alive. PDF views in-app."
            >
              <input type="file" name="file" />
            </Field>
            <p className="text-[12.5px] leading-relaxed text-muted">
              The author line is generated automatically from the CRediT roles on the Team tab, in
              author order.
            </p>
            <div className="flex justify-end">
              <button
                type="submit"
                className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                style={{ color: "#faf8f3" }}
              >
                Record output
              </button>
            </div>
          </form>
        </Details>
      ) : null}

      {outputs.length === 0 ? (
        <EmptyState
          title="No outputs recorded yet."
          hint="Preprints, datasets, code and policy briefs all count — not only journal papers."
        />
      ) : (
        outputs.map((o) => {
          const [bg, fg] = STATUS_PILL[o.status] ?? STATUS_PILL.DRAFT;
          return (
            <Card key={o.id} className="flex flex-col gap-2 border-t-[3px] border-t-brick px-[22px] py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brick">
                  {TYPE_LABEL[o.type] ?? o.type}
                </span>
                <div className="flex-1" />
                <Pill bg={bg} fg={fg}>
                  {o.status.replace("_", " ").toLowerCase()}
                </Pill>
              </div>
              <div className="font-serif text-[19px] font-medium leading-snug balance">{o.title}</div>
              {o.authorsLine ? (
                <div className="text-[13px] text-ink-3">{o.authorsLine}</div>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
                {o.venue ? <span>{o.venue}</span> : null}
                {o.publishedAt ? <span>{fullDate(o.publishedAt)}</span> : null}
                <span>{o.license}</span>
                {o.doi ? <span>DOI {o.doi}</span> : null}
                {o.url ? (
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="font-semibold">
                    Open
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
        })
      )}
    </div>
  );
}
