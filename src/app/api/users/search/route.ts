import { NextResponse } from "next/server";
import { db, ilike } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc } from "@/lib/format";

/** People search for the "New message" picker. Signed-in members only. */
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ people: [] }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ people: [] });

  const users = await db.user.findMany({
    where: {
      suspended: false,
      id: { not: me.id },
      OR: [{ name: ilike(q) }, { affiliation: ilike(q) }, { headline: ilike(q) }],
    },
    select: {
      id: true,
      name: true,
      headline: true,
      avatarColor: true,
      avatarUrl: true,
      avatarPath: true,
    },
    orderBy: { name: "asc" },
    take: 8,
  });

  return NextResponse.json({
    people: users.map((u) => ({
      id: u.id,
      name: u.name,
      headline: u.headline,
      avatarColor: u.avatarColor,
      avatarSrc: avatarSrc(u),
    })),
  });
}
