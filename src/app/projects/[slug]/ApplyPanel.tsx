"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { applyAction } from "@/actions/projects";
import { Button, Card, Field, FormError, Pill, SectionLabel } from "@/components/ui";
import { AVAILABILITY_OPTIONS } from "@/lib/enums";
import { statusPill } from "@/lib/theme";

type Opening = { id: string; role: string; skills: string };

export function ApplyPanel({
  projectId,
  projectTitle,
  leadName,
  openings,
  status,
  decisionNote,
  isMember,
  signedIn,
  slug,
}: {
  projectId: string;
  projectTitle: string;
  leadName: string;
  openings: Opening[];
  status: string | null;
  decisionNote: string | null;
  isMember: boolean;
  signedIn: boolean;
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(applyAction, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open]);

  const heading = "font-serif text-[19px] font-medium mb-1.5";
  const sub = "text-[13.5px] leading-[1.55] text-ink-4 mb-4";

  let panel: React.ReactNode;

  if (isMember && status !== "PENDING") {
    panel = (
      <>
        <div className={heading}>You&apos;re on the team</div>
        <div className={sub}>
          Welcome aboard. Check the Tasks tab for something to pick up, and say hello in Discussion.
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${slug}?tab=tasks`}
            className="border border-brick bg-card px-4 py-2 text-[12.5px] font-semibold text-brick no-underline hover:bg-brick-tint hover:no-underline"
          >
            Find a task
          </Link>
          <Pill bg="#e4ecdb" fg="#3e5730">
            Member
          </Pill>
        </div>
      </>
    );
  } else if (status === "PENDING" || status === "UNDER_REVIEW") {
    const p = statusPill(status);
    panel = (
      <>
        <div className={heading}>Application sent</div>
        <div className={sub}>
          {leadName} is reviewing your application. You&apos;ll be notified in your inbox as soon as
          there&apos;s a decision.
        </div>
        <Pill bg={p.bg} fg={p.fg}>
          {p.label}
        </Pill>
      </>
    );
  } else if (status === "DECLINED") {
    panel = (
      <>
        <div className={heading}>Not this time</div>
        <div className={sub}>
          {decisionNote ||
            "The lead decided not to move forward on this one. Plenty of other projects are recruiting — and you can apply again if the roles change."}
        </div>
        <div className="flex gap-2">
          <Pill bg="#f0ddd6" fg="#8a3325">
            Declined
          </Pill>
          <Link href="/?filter=recruiting" className="text-[13px] font-semibold">
            Browse other projects
          </Link>
        </div>
      </>
    );
  } else if (!signedIn) {
    panel = (
      <>
        <div className={heading}>Join this project</div>
        <div className={sub}>
          {openings.length} open role{openings.length === 1 ? "" : "s"}. Applications are reviewed by
          the project lead.
        </div>
        <Link
          href={`/login?next=/projects/${slug}`}
          className="block w-full bg-brick px-4 py-3 text-center text-[14px] font-semibold text-paper no-underline hover:bg-brick-dark hover:no-underline"
          style={{ color: "#faf8f3" }}
        >
          Sign in to apply
        </Link>
        <div className="mt-2 text-center text-[12.5px] text-muted">
          No account? <Link href="/register">Create one free</Link>
        </div>
      </>
    );
  } else if (openings.length === 0) {
    panel = (
      <>
        <div className={heading}>Not recruiting right now</div>
        <div className={sub}>
          This project has no open roles at the moment. Bookmark it — leads reopen roles as the work
          moves into new phases.
        </div>
      </>
    );
  } else {
    panel = (
      <>
        <div className={heading}>Join this project</div>
        <div className={sub}>
          {openings.length} open role{openings.length === 1 ? "" : "s"}. Applications are reviewed by
          the project lead — motivation matters more than credentials.
        </div>
        <Button className="w-full" onClick={() => setOpen(true)}>
          Apply to contribute
        </Button>
      </>
    );
  }

  return (
    <>
      <Card className="p-6">{panel}</Card>

      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(33,29,22,0.45)] p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Apply to ${projectTitle}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-up max-h-[86vh] w-full max-w-[560px] overflow-y-auto bg-card px-10 py-9 shadow-[0_24px_60px_rgba(33,29,22,0.3)]"
          >
            <div className="eyebrow mb-2" style={{ color: "#8a3325" }}>
              Application
            </div>
            <div className="mb-1.5 font-serif text-[24px] font-medium leading-tight">
              {projectTitle}
            </div>
            <div className="mb-6 text-[13.5px] text-ink-4">
              Reviewed by {leadName}. Most applicants hear back within a week.
            </div>

            <form action={action} className="flex flex-col gap-4">
              <input type="hidden" name="projectId" value={projectId} />
              <FormError>{state?.error}</FormError>

              <Field label="Role you're applying for">
                <select name="roleApplied" defaultValue={openings[0]?.role}>
                  {openings.map((o) => (
                    <option key={o.id} value={o.role}>
                      {o.role} — {o.skills}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Why do you want to contribute?">
                <textarea
                  name="motivation"
                  rows={4}
                  required
                  placeholder="A few sentences — motivation matters more than credentials here."
                />
              </Field>

              <Field label="Relevant skills or coursework">
                <input
                  name="skills"
                  placeholder="e.g. Python, statistics, literature search, Arabic transcription"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Weekly availability">
                  <select name="availability" defaultValue={AVAILABILITY_OPTIONS[0]}>
                    {AVAILABILITY_OPTIONS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </Field>
                <Field label="CV or portfolio link" hint="(optional)">
                  <input name="cvUrl" placeholder="https://…" />
                </Field>
              </div>

              <div className="mt-1.5 flex justify-end gap-2.5">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Sending…" : "Submit application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
