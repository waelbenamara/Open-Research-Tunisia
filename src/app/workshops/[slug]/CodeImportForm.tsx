"use client";

import { useState } from "react";
import { Details } from "@/components/Collapse";
import { Field } from "@/components/ui";
import { importCodeProjectAction } from "@/actions/code";

export function CodeImportForm({ workshopId }: { workshopId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await importCodeProjectAction(new FormData(e.currentTarget));
    // On success the action redirects; we only get here on failure.
    if (res?.error) {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <Details label="+ Add a code project">
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <input type="hidden" name="workshopId" value={workshopId} />
        <Field label="GitHub repository URL" hint="public repositories only">
          <input name="url" placeholder="https://github.com/owner/repo" required />
        </Field>
        <Field label="Title" hint="optional — defaults to owner/repo">
          <input name="title" placeholder="Workshop starter code" />
        </Field>
        {error ? <p className="text-[12.5px] font-semibold text-brick">{error}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="max-w-[420px] text-[11.5px] text-muted">
            We snapshot the repo (up to 400 files) so learners can browse it in-app. Big files and
            binaries are skipped.
          </span>
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer whitespace-nowrap border-none bg-brick px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50"
            style={{ color: "#faf8f3" }}
          >
            {busy ? "Importing…" : "Import code"}
          </button>
        </div>
      </form>
    </Details>
  );
}
