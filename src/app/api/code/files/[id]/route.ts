import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Serve a single code file's text content (members-only). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const file = await db.codeFile.findUnique({
    where: { id },
    select: { path: true, content: true, binary: true, size: true },
  });
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(
    { path: file.path, content: file.content, binary: file.binary, size: file.size },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
