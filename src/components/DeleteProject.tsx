"use client";

import { useActionState, useState } from "react";
import { deleteProjectAction } from "@/actions/projects";
import { FormError } from "@/components/ui";

/**
 * Danger-zone control to permanently delete a project. Two-step: reveal, then
 * type the exact title to arm the delete. Shown only to the lead or an admin.
 */
export function DeleteProject({
  projectId,
  title,
  members,
  contributions,
}: {
  projectId: string;
  title: string;
  members: number;
  contributions: number;
}) {
  const [state, action, pending] = useActionState(deleteProjectAction, null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const armed = confirm.trim() === title;

  const lost = [
    members > 1 ? `${members} members` : null,
    contributions > 0 ? `${contributions} logged contributions` : null,
    "all tasks, resources, meeting notes and outputs",
  ]
    .filter(Boolean)
    .join(", ");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer border border-brick bg-card px-4 py-2 text-[13px] font-semibold text-brick hover:bg-brick-tint"
      >
        Delete this project…
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 border border-brick bg-brick-tint/50 p-5">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="text-[13.5px] leading-relaxed text-ink-2">
        This <strong>permanently deletes</strong> “{title}” and everything in it — {lost}. It
        can&apos;t be undone.
      </div>
      <FormError>{state?.error}</FormError>
      <label className="text-[12.5px] font-semibold text-ink-3">
        Type <span className="font-mono text-brick">{title}</span> to confirm
        <input
          name="confirmTitle"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          className="mt-1.5"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!armed || pending}
          className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold disabled:opacity-40"
          style={{ color: "#faf8f3" }}
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm("");
          }}
          className="cursor-pointer border-none bg-transparent text-[13px] text-ink-4 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
