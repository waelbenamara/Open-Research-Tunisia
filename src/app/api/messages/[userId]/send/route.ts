import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createDirectMessage } from "@/lib/dm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Send a message with optional file attachments. The composer posts here via
 * XHR so it can render an upload progress bar (a server action can't report
 * upload progress). Returns the created message with its attachments.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { userId: recipientId } = await params;

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host") ?? "openresearchtunisia.org";

  const result = await createDirectMessage(me, {
    recipientId,
    body: String(form.get("body") || ""),
    files,
    origin: `${proto}://${host}`,
  });

  if (!result) return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ message: result });
}
