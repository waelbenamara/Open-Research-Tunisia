import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveDownload } from "@/lib/storage";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Profile pictures are public (they appear on public profiles), so no auth
 *  check — but only ever the avatarPath object, never arbitrary keys. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { avatarPath: true },
  });
  if (!user?.avatarPath) return new NextResponse("Not found", { status: 404 });

  const resolved = await resolveDownload(user.avatarPath);
  if (!resolved) return new NextResponse("Not found", { status: 404 });

  if (resolved.kind === "redirect") {
    return NextResponse.redirect(resolved.url);
  }

  const ext = resolved.filename.split(".").pop()?.toLowerCase() ?? "";
  return new NextResponse(new Uint8Array(resolved.body), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      // Public and cacheable; a re-upload changes nothing here for up to an
      // hour, which is an acceptable trade for not hitting storage per view.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
