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
      fileSize: true,
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

  const ext = fileExt(resource.filePath);
  const isHtml = ext === "html";

  const inline = viewableKind(ext) !== null;
  const safeTitle = resource.title.replace(/[^\w\s.-]/g, "").trim() || "file";

  if (resolved.kind === "redirect") {
    // Everything EXCEPT html can be redirected to the signed URL — Supabase
    // serves those with the right content type and it's efficient.
    if (!isHtml) return NextResponse.redirect(resolved.url);

    // HTML is the exception: Supabase deliberately serves uploaded HTML as
    // text/plain + nosniff (anti-XSS on *.supabase.co), so the browser would
    // show source instead of rendering. We must proxy it ourselves with the
    // correct type + sandbox CSP. Stream the upstream body straight through
    // so an 11 MB deck never buffers in memory or trips a response cap.
    const upstream = await fetch(resolved.url);
    if (!upstream.ok || !upstream.body) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "sandbox allow-scripts",
        "Content-Disposition": `inline; filename="${safeTitle}.html"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Local disk (dev): buffered body with the right type.
  const body = resolved.body;
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeTitle}.${ext}"`,
      "Content-Length": String(body.length),
      "Cache-Control": "private, no-store",
      ...(isHtml ? { "Content-Security-Policy": "sandbox allow-scripts" } : {}),
    },
  });
}
