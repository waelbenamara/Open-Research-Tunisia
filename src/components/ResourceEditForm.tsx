import { RESOURCE_KINDS, VISIBILITIES } from "@/lib/enums";
import { updateResourceAction } from "@/actions/projects";
import { Field } from "@/components/ui";
import { FolderPicker } from "@/components/FolderPicker";

/**
 * Metadata editor for an existing resource — everything but the file itself.
 * Rendered by whoever may also delete it (uploader, lead/facilitator, admin).
 * Pass `folders: null` where folders don't apply (workshop materials).
 */
export function ResourceEditForm({
  resource,
  folders,
}: {
  resource: {
    id: string;
    title: string;
    description: string | null;
    version: string;
    kind: string;
    visibility: string;
    folder: string;
  };
  folders: string[] | null;
}) {
  return (
    <form action={updateResourceAction} className="flex flex-col gap-3.5 pt-1">
      <input type="hidden" name="resourceId" value={resource.id} />
      <div className="grid gap-3.5 sm:grid-cols-[1fr_140px_100px]">
        <Field label="Title">
          <input name="title" defaultValue={resource.title} required />
        </Field>
        <Field label="Kind">
          <select name="kind" defaultValue={resource.kind}>
            {RESOURCE_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Version">
          <input name="version" defaultValue={resource.version} />
        </Field>
      </div>
      {folders !== null ? <FolderPicker folders={folders} current={resource.folder} /> : null}
      <div className="grid gap-3.5 sm:grid-cols-[1fr_180px]">
        <Field label="Short description" hint="optional">
          <input name="description" defaultValue={resource.description ?? ""} />
        </Field>
        <Field label="Who can see it">
          <select name="visibility" defaultValue={resource.visibility}>
            {VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {v === "PUBLIC" ? "Anyone" : v === "MEMBERS" ? "Signed-in members" : "Team only"}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[12.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
        >
          Save changes
        </button>
      </div>
    </form>
  );
}
