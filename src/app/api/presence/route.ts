import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Heartbeat — the signed-in user is here right now. Called on an interval by
 *  the Presence component in the layout. */
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  await db.user.update({ where: { id: me.id }, data: { lastSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}
