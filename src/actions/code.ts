"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/notify";
import { canManageWorkshop } from "@/lib/permissions";
import { parseRepoUrl, fetchRepoSnapshot } from "@/lib/github";

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
