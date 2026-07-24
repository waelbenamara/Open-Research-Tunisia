"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createProjectAction, updateProjectAction } from "@/actions/projects";
import { Button, Field, FormError, FormSuccess, SectionLabel } from "@/components/ui";
import {
  ETHICS_STATUSES,
  LANGUAGES,
  LICENSES,
  PROJECT_STAGES,
  RESEARCH_AREAS,
} from "@/lib/enums";

export type ProjectFormValues = {
  id?: string;
  title: string;
  summary: string;
  about: string;
  area: string;
  stage: string;
  tags: string;
  language: string;
  commitment: string;
  ethicsStatus: string;
  ethicsNote: string;
  license: string;
  dataStatement: string;
  linkedWorkshopId: string;
};

const EMPTY: ProjectFormValues = {
  title: "",
  summary: "",
  about: "",
  area: RESEARCH_AREAS[0],
  stage: "Proposal",
  tags: "",
  language: "English",
  commitment: "2–4 hours / week",
  ethicsStatus: "NOT_REQUIRED",
  ethicsNote: "",
  license: "CC-BY-4.0",
  dataStatement: "",
  linkedWorkshopId: "",
};

const STAGE_HINTS: Record<string, string> = {
  Proposal: "An idea taking shape — not recruiting yet.",
  Recruiting: "Open roles are listed and applications are welcome.",
  Active: "The team is working; you can still open roles anytime.",
  Writing: "Results are being written up.",
  Published: "The work is out — outputs should be listed.",
};

/** Mirrors slugify() in lib/format for the live URL preview. */
function previewSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

type OpeningDraft = { role: string; skills: string; seats: string };

export function ProjectForm({
  values = EMPTY,
  workshops,
  mode,
  requiresApproval = false,
}: {
  values?: ProjectFormValues;
  workshops: { id: string; title: string }[];
  mode: "create" | "edit";
  requiresApproval?: boolean;
}) {
  const [state, action, pending] = useActionState(
    mode === "create" ? createProjectAction : updateProjectAction,
    null,
  );

  const [title, setTitle] = useState(values.title);
  const [summary, setSummary] = useState(values.summary);
  const [stage, setStage] = useState(values.stage);
  const [ethicsStatus, setEthicsStatus] = useState(values.ethicsStatus);
  const [tags, setTags] = useState<string[]>(
    values.tags.split(",").map((t) => t.trim()).filter(Boolean),
  );
  const [tagDraft, setTagDraft] = useState("");
  const [openings, setOpenings] = useState<OpeningDraft[]>([{ role: "", skills: "", seats: "1" }]);

  const slug = previewSlug(title);
  const summaryShort = summary.trim().length > 0 && summary.trim().length < 30;

  function addTag() {
    const t = tagDraft.trim().replace(/,+$/, "");
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase()) && tags.length < 8) {
      setTags([...tags, t]);
    }
    setTagDraft("");
  }

  function setOpening(i: number, patch: Partial<OpeningDraft>) {
    setOpenings(openings.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  }

  return (
    <form action={action} className="flex flex-col gap-7">
      {values.id ? <input type="hidden" name="projectId" value={values.id} /> : null}
      <input type="hidden" name="tags" value={tags.join(", ")} />
      {mode === "create" ? (
        <input
          type="hidden"
          name="openingsJson"
          value={JSON.stringify(
            openings
              .map((o) => ({ role: o.role.trim(), skills: o.skills.trim(), seats: Number(o.seats) || 1 }))
              .filter((o) => o.role),
          )}
        />
      ) : null}
      <FormError>{state?.error}</FormError>
      <FormSuccess>{state?.success}</FormSuccess>

      <section className="flex flex-col gap-4">
        <SectionLabel>The basics</SectionLabel>
        <Field label="Title" hint="say what the research actually asks">
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Forecasting Water Stress in the Medjerda Basin"
          />
          {mode === "create" && slug ? (
            <div className="mt-1.5 text-[12px] text-muted">
              Will live at <span className="font-mono">/projects/{slug}</span>
            </div>
          ) : null}
        </Field>
        <Field label="One-paragraph summary" hint="shown on the discover card">
          <textarea
            name="summary"
            rows={3}
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Building an open, reproducible model that forecasts seasonal water stress…"
          />
          <div className={`mt-1 text-[12px] ${summaryShort ? "text-brick" : "text-muted"}`}>
            {summaryShort
              ? `${30 - summary.trim().length} more characters needed`
              : `${summary.trim().length} characters`}
          </div>
        </Field>
        <Field
          label="About this project"
          hint="the full description — context, method, how contributors are organised"
        >
          <textarea name="about" rows={8} defaultValue={values.about} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Research area">
            <select name="area" defaultValue={values.area}>
              {RESEARCH_AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Stage">
            <select name="stage" value={stage} onChange={(e) => setStage(e.target.value)}>
              {PROJECT_STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <div className="mt-1 text-[12px] text-muted">{STAGE_HINTS[stage] ?? ""}</div>
          </Field>
          <Field label="Working language">
            <select name="language" defaultValue={values.language}>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tags" hint={`press Enter to add — ${8 - tags.length} left`}>
            {tags.length > 0 ? (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 border border-line bg-tint px-2 py-0.5 text-[12.5px]"
                  >
                    {t}
                    <button
                      type="button"
                      aria-label={`Remove tag ${t}`}
                      className="text-muted hover:text-brick"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <input
              value={tagDraft}
              onChange={(e) => {
                if (e.target.value.endsWith(",")) {
                  setTagDraft(e.target.value);
                  addTag();
                } else setTagDraft(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
                if (e.key === "Backspace" && !tagDraft && tags.length) {
                  setTags(tags.slice(0, -1));
                }
              }}
              placeholder={tags.length ? "" : "Climate, Machine learning, GIS"}
              disabled={tags.length >= 8}
            />
          </Field>
          <Field label="Typical commitment">
            <input
              name="commitment"
              defaultValue={values.commitment}
              list="commitment-presets"
              placeholder="2–4 hours / week"
            />
            <datalist id="commitment-presets">
              <option value="2–4 hours / week" />
              <option value="5–8 hours / week" />
              <option value="9+ hours / week" />
              <option value="Flexible" />
            </datalist>
          </Field>
        </div>
      </section>

      {mode === "create" ? (
        <section className="flex flex-col gap-4">
          <SectionLabel>Open roles</SectionLabel>
          <p className="-mt-2 text-[13px] leading-relaxed text-ink-4">
            Be honest about what&apos;s needed — &ldquo;willingness to learn&rdquo; is a valid
            requirement and attracts the people this initiative exists for. You can add more roles
            later from the project page.
          </p>
          <div className="flex flex-col gap-2">
            {openings.map((o, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1.2fr_1.6fr_84px_36px]">
                <input
                  value={o.role}
                  onChange={(e) => setOpening(i, { role: e.target.value })}
                  placeholder={i === 0 ? "Data analyst" : "Role"}
                  aria-label={`Role ${i + 1}`}
                />
                <input
                  value={o.skills}
                  onChange={(e) => setOpening(i, { skills: e.target.value })}
                  placeholder={i === 0 ? "Python, pandas — workshop available" : "Required skills"}
                  aria-label={`Skills for role ${i + 1}`}
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={o.seats}
                  onChange={(e) => setOpening(i, { seats: e.target.value })}
                  aria-label={`Seats for role ${i + 1}`}
                  title="Seats"
                />
                <button
                  type="button"
                  aria-label={`Remove role ${i + 1}`}
                  className="text-[18px] text-muted hover:text-brick disabled:opacity-30"
                  onClick={() => setOpenings(openings.filter((_, j) => j !== i))}
                  disabled={openings.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpenings([...openings, { role: "", skills: "", seats: "1" }])}
              disabled={openings.length >= 10}
            >
              + Add another role
            </Button>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <SectionLabel>Openness &amp; governance</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Output licence">
            <select name="license" defaultValue={values.license}>
              {LICENSES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Ethics review" hint="required for human subjects or identifiable data">
            <select
              name="ethicsStatus"
              value={ethicsStatus}
              onChange={(e) => setEthicsStatus(e.target.value)}
            >
              {ETHICS_STATUSES.map((e) => (
                <option key={e} value={e}>
                  {e === "NOT_REQUIRED" ? "Not required" : e === "PENDING" ? "Under review" : "Approved"}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {ethicsStatus !== "NOT_REQUIRED" ? (
          <Field
            label="Ethics note"
            hint={
              ethicsStatus === "APPROVED"
                ? "committee and reference number — shown on the project page"
                : "which committee is reviewing, and since when"
            }
          >
            <input
              name="ethicsNote"
              defaultValue={values.ethicsNote}
              placeholder="Comité de Protection des Personnes — ref. 2026-041"
            />
          </Field>
        ) : (
          <input type="hidden" name="ethicsNote" value={values.ethicsNote} />
        )}
        <Field label="Data statement" hint="where the data comes from and how it may be reused">
          <textarea
            name="dataStatement"
            rows={2}
            defaultValue={values.dataStatement}
            placeholder="Rainfall data from INM under an open licence; no personal data collected."
          />
        </Field>
        <Field label="Linked workshop" hint="the workshop that teaches the skills this project needs">
          <select name="linkedWorkshopId" defaultValue={values.linkedWorkshopId}>
            <option value="">— none —</option>
            {workshops.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <div className="flex items-center justify-end gap-4">
        {mode === "create" && requiresApproval ? (
          <span className="text-[12.5px] text-muted">
            Goes live once an admin approves it.
          </span>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? requiresApproval
                ? "Submit for review"
                : "Publish project"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
