import "server-only";
import { headers } from "next/headers";

// The canonical production URL (the apex 308-redirects to the www host).
const PROD_ORIGIN = "https://www.openresearchtunisia.org";

/**
 * The base URL to put in EMAIL links. It must never be a Vercel deployment URL
 * (e.g. cron jobs run on a *.vercel.app host), so we prefer an explicit
 * APP_URL, then the canonical production domain, and only fall back to the
 * request host in local development.
 */
export async function appOrigin(): Promise<string> {
  const configured = (process.env.APP_URL ?? "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.VERCEL) return PROD_ORIGIN;
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return "http://localhost:3000";
  }
}
