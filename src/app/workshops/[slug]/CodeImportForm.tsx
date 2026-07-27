"use client";

import { useState } from "react";
import { Details } from "@/components/Collapse";
import { Field } from "@/components/ui";
import { importCodeProjectAction, importCodeZipAction } from "@/actions/code";

export function CodeImportForm({ workshopId }: { workshopId: string }) {
  const [mode, setMode] = useState<"github" | "zip">("github");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = mode === "github" ? await importCodeProjectAction(fd) : await importCodeZipAction(fd);
    // On success the action redirects; we only reach here on failure.
    if (res?.error) {
      setError(res.error);
      setBusy(false);
    }
  }

  const tab = (key: "github" | "zip", label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(key);
        setError(null);
      }}
      className="cursor-pointer border-none bg-transparent px-1 py-1.5 text-[12.5px] font-semibold"
      style={{
        color: mode === key ? "#8a3325" : "#6e675a",
        borderBottom: `2px solid ${mode === key ? "#8a3325" : "transparent"}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <Details label="+ Add a code project">
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <input type="hidden" name="workshopId" value={workshopId} />

        <div className="flex gap-4 border-b border-line-soft">
          {tab("github", "From GitHub")}
          {tab("zip", "Upload a .zip")}
        </div>

        {mode === "github" ? (
          <Field label="GitHub repository URL" hint="public repositories only">
            <input name="url" placeholder="https://github.com/owner/repo" required />
          </Field>
        ) : (
          <Field label="Zip file" hint="a zipped folder of code, up to 12 MB">
            <input type="file" name="zip" accept=".zip,application/zip" required />
          </Field>
        )}

        <Field label="Title" hint="optional">
          <input name="title" placeholder="Workshop starter code" />
        </Field>

        {error ? <p className="text-[12.5px] font-semibold text-brick">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="max-w-[420px] text-[11.5px] text-muted">
            We snapshot the code (up to 400 files) so learners can browse it in-app. Big files and
            binaries are skipped.
          </span>
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer whitespace-nowrap border-none bg-brick px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50"
            style={{ color: "#faf8f3" }}
          >
            {busy ? "Importing…" : mode === "github" ? "Import code" : "Upload code"}
          </button>
        </div>
      </form>
    </Details>
  );
}
