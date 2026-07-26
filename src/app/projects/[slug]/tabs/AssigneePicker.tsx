"use client";

import { useRef } from "react";
import { reassignTaskAction } from "@/actions/projects";

type Person = { userId: string; name: string };

/**
 * Inline reassignment for managers: a compact select that submits the moment
 * it changes, so a lead can hand a task to anyone (or unassign it) in one click.
 */
export function AssigneePicker({
  taskId,
  currentId,
  people,
}: {
  taskId: string;
  currentId: string | null;
  people: Person[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={reassignTaskAction} ref={formRef} className="min-w-0">
      <input type="hidden" name="taskId" value={taskId} />
      <label className="sr-only" htmlFor={`assignee-${taskId}`}>
        Assign task
      </label>
      <select
        id={`assignee-${taskId}`}
        name="assigneeId"
        defaultValue={currentId ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        title="Assign this task to someone"
        className="!m-0 max-w-[150px] cursor-pointer truncate !border-line-input !bg-card !py-1 !pl-2 !pr-6 !text-[11.5px] !text-ink-4 hover:!border-brick"
      >
        <option value="">Unassigned</option>
        {people.map((p) => (
          <option key={p.userId} value={p.userId}>
            {p.name}
          </option>
        ))}
      </select>
    </form>
  );
}
