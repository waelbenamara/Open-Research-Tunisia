import { NextResponse } from "next/server";
import { runDigest } from "@/lib/digest";
import { appOrigin } from "@/lib/appUrl";

// Digests send email and touch many rows — never let this be statically cached.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled by Vercel Cron (see vercel.json) to run daily; the per-user
 * throttle inside runDigest() spaces each person's email to ~every 2 days.
 *
 * Secured with CRON_SECRET: Vercel Cron sends it as a Bearer token. When the
 * secret is unset (local dev) the endpoint is open so it's easy to test.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const url = new URL(request.url);
    const ok = auth === `Bearer ${secret}` || url.searchParams.get("key") === secret;
    if (!ok) return new NextResponse("Unauthorized", { status: 401 });
  }

  // Always use the canonical domain — a cron runs on a *.vercel.app host, so the
  // request host would otherwise leak a Vercel deployment URL into the emails.
  const result = await runDigest(await appOrigin());

  return NextResponse.json({ ok: true, ...result });
}
