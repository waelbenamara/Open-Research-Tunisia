import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

/** GET /api/v1/me — the authenticated user and the key's scopes. */
export const GET = withApiAuth({ scope: "read" }, async (ctx) => {
  return NextResponse.json({
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    role: ctx.user.role,
    can_post_projects: ctx.user.canPostProjects,
    scopes: ctx.scopes,
  });
});
