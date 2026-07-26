import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MIME_BY_EXT, resolveDownload } from "@/lib/storage";

/** Serve a feed post's photo. The feed is members-only, so require a session. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return new NextResponse("Not found", { status: 404 });

  const image = await db.postImage.findUnique({
    where: { id },
    select: { blob: { select: { storageKey: true, ext: true } } },
  });
  if (!image) return new NextResponse("Not found", { status: 404 });

  const resolved = await resolveDownload(image.blob.storageKey);
  if (!resolved) return new NextResponse("Not found", { status: 404 });

  if (resolved.kind === "redirect") return NextResponse.redirect(resolved.url);

  return new NextResponse(new Uint8Array(resolved.body), {
    headers: {
      "Content-Type": MIME_BY_EXT[image.blob.ext] ?? "application/octet-stream",
      "Content-Length": String(resolved.body.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
