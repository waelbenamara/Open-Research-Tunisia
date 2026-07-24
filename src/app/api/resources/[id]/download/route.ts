import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessResource } from "@/lib/resourceAccess";
import { resolveDownload } from "@/lib/storage";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv",
  json: "application/json",
  jsonl: "application/x-ndjson",
  txt: "text/plain",
  md: "text/markdown",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  zip: "application/zip",
};

/** Every file download goes through here so visibility is actually enforced. */
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
    return NextResponse.redirect(resolved.url);
  }

  const ext = resolved.filename.split(".").pop()?.toLowerCase() ?? "";
  // Keep the human-readable title as the saved filename, sanitised.
  const safeTitle = resource.title.replace(/[^\w\s.-]/g, "").trim() || "download";

  return new NextResponse(new Uint8Array(resolved.body), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeTitle}.${ext}"`,
      "Content-Length": String(resolved.body.length),
      // Signed/permissioned content must never land in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
