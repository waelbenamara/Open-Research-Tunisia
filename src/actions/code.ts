"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/notify";
import { canManageWorkshop } from "@/lib/permissions";
import { parseRepoUrl, fetchRepoSnapshot, isIgnoredPath, isBinaryPath, CODE_CAPS } from "@/lib/github";
import { unzipSync, strFromU8 } from "fflate";

/** Import a public GitHub repo as a browsable code project on a workshop.
 *  Returns { error } on failure; redirects to the browser on success. */
export async function importCodeProjectAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  const user = await requireUser();
  const workshopId = String(formData.get("workshopId") || "");
  const url = String(formData.get("url") || "").trim();
  const title = String(formData.get("title") || "").trim();

  const workshop = await db.workshop.findUnique({
    where: { id: workshopId },
    select: { id: true, slug: true, facilitatorId: true },
  });
  if (!workshop) return { error: "Workshop not found." };
  if (!(await canManageWorkshop(workshop.facilitatorId, user))) {
    return { error: "Only the workshop's facilitator can add code." };
  }

  const parsed = parseRepoUrl(url);
  if (!parsed) {
    return { error: "Enter a valid GitHub repository URL, e.g. https://github.com/owner/repo." };
  }

  let snap;
  try {
    snap = await fetchRepoSnapshot(parsed.owner, parsed.repo, parsed.ref);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't import that repository." };
  }

  const project = await db.codeProject.create({
    data: {
      title: title || `${parsed.owner}/${parsed.repo}`,
      sourceUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
      sourceRef: snap.ref,
      commitSha: snap.commitSha,
      fileCount: snap.files.length,
      totalBytes: snap.totalBytes,
      truncated: snap.truncated,
      workshopId: workshop.id,
      uploadedById: user.id,
    },
  });
  await db.codeFile.createMany({
    data: snap.files.map((f) => ({
      projectId: project.id,
      path: f.path,
      content: f.content,
      size: f.size,
      binary: f.binary,
    })),
  });
  await audit(user.id, "CODE_IMPORT", "Workshop", workshop.id, `${parsed.owner}/${parsed.repo}`);
  revalidatePath(`/workshops/${workshop.slug}`);

  // Must be outside any try/catch so the redirect propagates.
  redirect(`/code/${project.id}`);
}

/** Import a .zip of code as a browsable code project on a workshop. */
export async function importCodeZipAction(formData: FormData): Promise<{ error: string } | void> {
  const user = await requireUser();
  const workshopId = String(formData.get("workshopId") || "");
  const title = String(formData.get("title") || "").trim();
  const file = formData.get("zip");

  if (!(file instanceof File) || file.size === 0) return { error: "Choose a .zip file to upload." };
  if (file.size > 12 * 1024 * 1024) return { error: "That zip is larger than 12 MB." };

  const workshop = await db.workshop.findUnique({
    where: { id: workshopId },
    select: { id: true, slug: true, facilitatorId: true },
  });
  if (!workshop) return { error: "Workshop not found." };
  if (!(await canManageWorkshop(workshop.facilitatorId, user))) {
    return { error: "Only the workshop's facilitator can add code." };
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return { error: "Couldn't read that file — is it a valid .zip?" };
  }

  // Real files only (skip directory entries).
  const realPaths = Object.keys(entries).filter((p) => !p.endsWith("/"));
  // Strip a single common top-level folder (e.g. "my-project-main/").
  const roots = new Set(realPaths.map((p) => p.split("/")[0]));
  const commonRoot =
    roots.size === 1 && realPaths.every((p) => p.includes("/")) ? `${[...roots][0]}/` : "";

  const eligible = realPaths
    .map((p) => ({ zipPath: p, path: commonRoot && p.startsWith(commonRoot) ? p.slice(commonRoot.length) : p }))
    .filter((f) => f.path && !isIgnoredPath(f.path))
    .sort((a, b) => a.path.localeCompare(b.path));

  if (eligible.length === 0) return { error: "No source files found in that zip." };

  const chosen = eligible.slice(0, CODE_CAPS.MAX_FILES);
  let truncated = eligible.length > chosen.length;
  let totalBytes = 0;

  const files = chosen.map(({ zipPath, path }) => {
    const data = entries[zipPath];
    const binaryExt = isBinaryPath(path);
    if (binaryExt || data.length > CODE_CAPS.MAX_FILE_SIZE || totalBytes > CODE_CAPS.MAX_TOTAL) {
      if (!binaryExt) truncated = true;
      return { path, content: null, size: data.length, binary: binaryExt };
    }
    const text = strFromU8(data);
    if (text.indexOf(CODE_CAPS.NUL) !== -1) return { path, content: null, size: data.length, binary: true };
    totalBytes += text.length;
    return { path, content: text, size: data.length, binary: false };
  });

  const project = await db.codeProject.create({
    data: {
      title: title || file.name.replace(/\.zip$/i, "") || "Code",
      fileCount: files.length,
      totalBytes,
      truncated,
      workshopId: workshop.id,
      uploadedById: user.id,
    },
  });
  await db.codeFile.createMany({
    data: files.map((f) => ({ projectId: project.id, path: f.path, content: f.content, size: f.size, binary: f.binary })),
  });
  await audit(user.id, "CODE_IMPORT", "Workshop", workshop.id, file.name);
  revalidatePath(`/workshops/${workshop.slug}`);

  redirect(`/code/${project.id}`);
}

export async function deleteCodeProjectAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const project = await db.codeProject.findUnique({
    where: { id },
    select: { uploadedById: true, workshop: { select: { slug: true, facilitatorId: true } } },
  });
  if (!project) return;

  const isManager = project.workshop
    ? await canManageWorkshop(project.workshop.facilitatorId, user)
    : project.uploadedById === user.id || user.role === "ADMIN";
  if (project.uploadedById !== user.id && !isManager) throw new Error("FORBIDDEN");

  await db.codeProject.delete({ where: { id } });
  if (project.workshop) revalidatePath(`/workshops/${project.workshop.slug}`);
}
