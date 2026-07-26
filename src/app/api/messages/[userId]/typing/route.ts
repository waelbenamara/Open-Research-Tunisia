import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Signal that I'm typing to `userId`. The composer pings this (throttled)
 *  while there's text; the partner's poll picks it up for a few seconds. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const { userId: otherId } = await params;
  await db.user.update({
    where: { id: me.id },
    data: { typingToId: otherId, typingAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
