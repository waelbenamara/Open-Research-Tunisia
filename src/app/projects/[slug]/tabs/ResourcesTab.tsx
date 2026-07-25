import { db } from "@/lib/db";
import { KIND_COLORS } from "@/lib/theme";
import { RESOURCE_KINDS, VISIBILITIES } from "@/lib/enums";
import { fileExt, fileSize, shortDate, viewableKind } from "@/lib/format";
import { addResourceAction, deleteResourceAction } from "@/actions/projects";
import { Card, EmptyState, Field, KindBadge } from "@/components/ui";
import { Details } from "@/components/Collapse";
import type { ProjectAccess } from "@/lib/permissions";

type ResourceRow = {
  id: string;
  title: string;
  kind: string;
  url: string | null;
  filePath: string | null;
  fileSize: number | null;
  version: string;
  description: string | null;
  folder: string;
  visibility: string;
  createdAt: Date;
  uploadedBy: { name: string };
};

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 14" width="14" height="12" aria-hidden className="text-ink-4">
      <path d="M1 2.5h5l1.5 2H15v8H1z" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function Row({ r, canManage }: { r: ResourceRow; canManage: boolean }) {
  const [bg, fg] = KIND_COLORS[r.kind] ?? KIND_COLORS.LINK;
  return (
    <Card className="flex items-center gap-4 px-5 py-4 transition-colors hover:border-line-strong">
      <KindBadge kind={r.kind} bg={bg} fg={fg} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold">{r.title}</div>
        <div className="mt-0.5 text-[12.5px] text-muted">
          {[
            r.version,
            r.description,
            fileSize(r.fileSize),
            `added ${shortDate(r.createdAt)} by ${r.uploadedBy.name}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      {r.visibility !== "PUBLIC" ? (
        <span className="text-[11px] uppercase tracking-wide text-muted">
          {r.visibility === "TEAM" ? "Team" : "Members"}
        </span>
      ) : null}
      {r.filePath ? (
        <span className="flex items-center gap-3">
          {viewableKind(fileExt(r.filePath)) ? (
            <a href={`/resources/${r.id}`} className="text-[13px] font-semibold">
              View
            </a>
          ) : null}
          <a href={`/api/resources/${r.id}/download`} className="text-[13px] font-semibold text-ink-4">
            Download
          </a>
        </span>
      ) : r.url ? (
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold">
          Open
        </a>
      ) : null}
      {canManage ? (
        <form action={deleteResourceAction}>
          <input type="hidden" name="resourceId" value={r.id} />
          <button
            type="submit"
            className="cursor-pointer border-none bg-transparent text-[12px] text-muted hover:text-brick"
            aria-label={`Remove ${r.title}`}
          >
            Remove
          </button>
        </form>
      ) : null}
    </Card>
  );
}

export async function ResourcesTab({
  projectId,
  access,
  signedIn,
}: {
  projectId: string;
  access: ProjectAccess;
  signedIn: boolean;
}) {
  // Three-tier visibility: PUBLIC for anyone, MEMBERS for any signed-in
  // member of the platform, TEAM for the project team — matching the
  // download route's enforcement in lib/resourceAccess.
  const tiers = signedIn ? ["PUBLIC", "MEMBERS"] : ["PUBLIC"];
  const visible = access.canSeeInternal ? undefined : { visibility: { in: tiers } };

  const resources = await db.resource.findMany({
    where: { projectId, ...(visible ?? {}) },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: [{ folder: "asc" }, { createdAt: "desc" }],
  });

  const hidden = access.canSeeInternal
    ? 0
    : await db.resource.count({ where: { projectId, visibility: { notIn: tiers } } });

  // Group into path-style folders; "" is the project root and renders first.
  const groups = new Map<string, ResourceRow[]>();
  for (const r of resources) {
    const key = r.folder ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const folderNames = [...groups.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b));
  const existingFolders = folderNames;

  return (
    <div className="flex flex-col gap-2.5">
      {access.canManage ? (
        <Details label="+ Add resource">
          <form action={addResourceAction} className="flex flex-col gap-3.5">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="grid gap-3.5 sm:grid-cols-[1fr_140px_100px]">
              <Field label="Title">
                <input name="title" required placeholder="Literature review — living document" />
              </Field>
              <Field label="Kind">
                <select name="kind" defaultValue="AUTO">
                  <option value="AUTO">Detect from file</option>
                  {RESOURCE_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <Field label="Version">
                <input name="version" defaultValue="v1" />
              </Field>
            </div>
            <Field
              label="Folder"
              hint="optional — use / for subfolders, e.g. Data/Raw. New names create the folder."
            >
              <input name="folder" list="existing-folders" placeholder="Literature" />
              <datalist id="existing-folders">
                {existingFolders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </Field>
            <Field label="Upload a file" hint="up to 25 MB — PDF, data, slides, video, notebooks, HTML presentations">
              <input type="file" name="file" />
            </Field>
            <Field label="…or link to it" hint="Drive, Colab, GitHub, Zenodo — anything with a URL">
              <input name="url" placeholder="https://…" />
            </Field>
            <div className="grid gap-3.5 sm:grid-cols-[1fr_180px]">
              <Field label="Short description" hint="optional">
                <input name="description" placeholder="Maintained by the literature pod" />
              </Field>
              <Field label="Who can see it">
                <select name="visibility" defaultValue="MEMBERS">
                  {VISIBILITIES.map((v) => (
                    <option key={v} value={v}>
                      {v === "PUBLIC" ? "Anyone" : v === "MEMBERS" ? "Signed-in members" : "Project team"}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="cursor-pointer border-none bg-brick px-5 py-2.5 text-[13px] font-semibold"
                style={{ color: "#faf8f3" }}
              >
                Add resource
              </button>
            </div>
          </form>
        </Details>
      ) : null}

      {resources.length === 0 ? (
        <EmptyState
          title="No resources yet."
          hint="Literature reviews, datasets, notebooks and recordings show up here."
        />
      ) : (
        <>
          {(groups.get("") ?? []).map((r) => (
            <Row key={r.id} r={r} canManage={access.canManage} />
          ))}

          {folderNames.map((folder) => (
            <div key={folder} className="flex flex-col gap-2.5">
              <div className="mt-3 flex items-center gap-2 border-b border-line-soft pb-1.5">
                <FolderIcon />
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  {folder.split("/").join(" / ")}
                </span>
                <span className="text-[11.5px] text-muted">{groups.get(folder)!.length}</span>
              </div>
              {groups.get(folder)!.map((r) => (
                <Row key={r.id} r={r} canManage={access.canManage} />
              ))}
            </div>
          ))}
        </>
      )}

      {hidden > 0 ? (
        <div className="mt-2 border border-dashed border-line-input px-5 py-4 text-[13px] text-ink-4">
          {hidden} more resource{hidden === 1 ? " is" : "s are"} visible to project members only.
          Apply to contribute to get access.
        </div>
      ) : null}
    </div>
  );
}
