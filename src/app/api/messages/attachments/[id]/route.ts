import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fileExt, viewableKind } from "@/lib/format";
import { MIME_BY_EXT, resolveDownload } from "@/lib/storage";

/**
 * Serve a shared file from a conversation. Only the two people in that
 * conversation may fetch it. Viewable types (pdf, images, video, text) render
 * inline; HTML is sandboxed; everything else downloads.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return new NextResponse("Not found", { status: 404 });

  const att = await db.messageAttachment.findUnique({
    where: { id },
    select: {
      filename: true,
      message: { select: { senderId: true, recipientId: true } },
      blob: { select: { storageKey: true } },
    },
  });
  // 404 (not 403) if it isn't yours — don't confirm the file exists.
  if (!att || (att.message.senderId !== me.id && att.message.recipientId !== me.id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = fileExt(att.filename);
  const isHtml = ext === "html";
  const resolved = await resolveDownload(att.blob.storageKey);
  if (!resolved) return new NextResponse("Not found", { status: 404 });

  const safeName = att.filename.replace(/[^\w.\- ]/g, "").trim() || `file.${ext}`;

  if (resolved.kind === "redirect") {
    if (!isHtml) return NextResponse.redirect(resolved.url);
    // HTML from Supabase is served as text/plain — proxy it with the right type.
    const upstream = await fetch(resolved.url);
    if (!upstream.ok || !upstream.body) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "sandbox allow-scripts",
        "Cache-Control": "private, no-store",
      },
    });
  }

  const inline = viewableKind(ext) !== null;
  return new NextResponse(new Uint8Array(resolved.body), {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "Content-Length": String(resolved.body.length),
      "Cache-Control": "private, no-store",
      ...(isHtml ? { "Content-Security-Policy": "sandbox allow-scripts" } : {}),
    },
  });
}
