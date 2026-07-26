import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiAuth } from "@/lib/apiAuth";
import { serializeWorkshop } from "@/lib/apiSerialize";

export const dynamic = "force-dynamic";

/** GET /api/v1/workshops — list public workshops. */
export const GET = withApiAuth({ scope: "read" }, async (_ctx, request) => {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);
  const workshops = await db.workshop.findMany({
    where: { status: { not: "DRAFT" } },
    include: { facilitator: { select: { id: true, name: true } } },
    orderBy: { startDate: "asc" },
    take: limit,
  });
  return NextResponse.json({ data: workshops.map(serializeWorkshop) });
});
