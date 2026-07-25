"use client";

import { useState } from "react";
import { Field } from "@/components/ui";

/**
 * Explicit folder selection: pick an existing folder from the dropdown, or
 * choose "Create a new folder…" which reveals the name input. The chosen
 * value is submitted through the hidden `folder` input.
 */
export function FolderPicker({
  folders,
  current = "",
}: {
  folders: string[];
  current?: string;
}) {
  const known = folders.includes(current) || current === "";
  const [choice, setChoice] = useState(known ? current : "__new__");
  const [newName, setNewName] = useState(known ? "" : current);
  const isNew = choice === "__new__";

  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      <Field label="Folder">
        <select value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Project root — no folder</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f.split("/").join(" / ")}
            </option>
          ))}
          <option value="__new__">+ Create a new folder…</option>
        </select>
      </Field>
      {isNew ? (
        <Field label="New folder name" hint="use / for a subfolder — e.g. Data/Raw">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Literature"
            autoFocus
          />
        </Field>
      ) : null}
      <input type="hidden" name="folder" value={isNew ? newName : choice} />
    </div>
  );
}
