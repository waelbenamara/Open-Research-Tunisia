import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fileExt, viewableKind } from "@/lib/format";
import { MIME_BY_EXT, resolveDownload } from "@/lib/storage";

/**
 * Serve an output's archived file. Outputs are the initiative's public
 * evidence, so no login is required — but only once the project has cleared
 * review and isn't archived.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const output = await db.output.findUnique({
    where: { id },
    select: {
      title: true,
      filePath: true,
      project: { select: { approvalStatus: true, archived: true } },
    },
  });
  if (
    !output?.filePath ||
    output.project.approvalStatus !== "APPROVED" ||
    output.project.archived
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const resolved = await resolveDownload(output.filePath);
  if (!resolved) return new NextResponse("Not found", { status: 404 });
  if (resolved.kind === "redirect") return NextResponse.redirect(resolved.url);

  const ext = fileExt(resolved.filename);
  const inline = viewableKind(ext) !== null;
  const safeTitle = output.title.replace(/[^\w\s.-]/g, "").trim() || "output";

  return new NextResponse(new Uint8Array(resolved.body), {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeTitle}.${ext}"`,
      "Content-Length": String(resolved.body.length),
      // Public artifacts of approved projects are safe to cache.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
