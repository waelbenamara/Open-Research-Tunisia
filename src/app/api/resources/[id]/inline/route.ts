import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessResource } from "@/lib/resourceAccess";
import { fileExt, viewableKind } from "@/lib/format";
import { MIME_BY_EXT, resolveDownload } from "@/lib/storage";

/**
 * Serve a stored file for in-browser viewing — same access rules as the
 * download route, but with an inline disposition so PDFs, images, video and
 * audio render in place. Types the browser can't (or shouldn't) render
 * inline fall back to an attachment.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const resource = await db.resource.findUnique({
    where: { id },
    select: {
      title: true,
      filePath: true,
      visibility: true,
      projectId: true,
      workshopId: true,
      uploadedById: true,
    },
  });
  if (!resource || !resource.filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await getCurrentUser();
  if (!(await canAccessResource(resource, user))) {
    // 404 rather than 403: don't confirm that a team-only file exists.
    return new NextResponse("Not found", { status: 404 });
  }

  const resolved = await resolveDownload(resource.filePath);
  if (!resolved) return new NextResponse("Not found", { status: 404 });

  if (resolved.kind === "redirect") {
    // Supabase signed URLs serve with the stored content type — inline by default.
    return NextResponse.redirect(resolved.url);
  }

  const ext = fileExt(resolved.filename);
  const inline = viewableKind(ext) !== null;
  const safeTitle = resource.title.replace(/[^\w\s.-]/g, "").trim() || "file";

  return new NextResponse(new Uint8Array(resolved.body), {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeTitle}.${ext}"`,
      "Content-Length": String(resolved.body.length),
      "Cache-Control": "private, no-store",
    },
  });
}
