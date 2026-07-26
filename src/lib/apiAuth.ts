import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "./db";
import type { SessionUser } from "./auth";

export const KEY_PREFIX = "ort_";
export type Scope = "read" | "write";

/** Generate a fresh raw key + its stored hash + a display prefix. */
export function generateApiKey() {
  const raw = `${KEY_PREFIX}${randomBytes(24).toString("hex")}`;
  return { raw, hashedKey: hashKey(raw), prefix: raw.slice(0, 12) };
}

export function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export type ApiContext = { user: SessionUser; scopes: Scope[]; keyId: string };

/** Consistent JSON error, e.g. apiError("forbidden", "…", 403). */
export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Resolve the Bearer key on a request to its owner, or null. Also stamps
 *  lastUsedAt (at most once a minute) so users can see a key is live. */
async function resolveKey(request: Request): Promise<ApiContext | null> {
  const header = request.headers.get("authorization") ?? "";
  const raw = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!raw.startsWith(KEY_PREFIX)) return null;

  const key = await db.apiKey.findUnique({
    where: { hashedKey: hashKey(raw) },
    include: { user: true },
  });
  if (!key || key.revokedAt || key.user.suspended) return null;

  if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000) {
    await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  }

  const u = key.user;
  return {
    keyId: key.id,
    scopes: key.scopes.split(",").map((s) => s.trim()) as Scope[],
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      canPostProjects: u.canPostProjects,
      avatarColor: u.avatarColor,
      avatarSrc: null,
      affiliation: u.affiliation,
      headline: u.headline,
    },
  };
}

/**
 * Wrap an API v1 handler with authentication and scope enforcement. The handler
 * receives the resolved context and may throw an `ApiHttpError` to return a
 * clean status; any other throw becomes a 500.
 */
export function withApiAuth(
  opts: { scope?: Scope },
  handler: (ctx: ApiContext, request: Request, params: Record<string, string>) => Promise<NextResponse>,
) {
  return async (
    request: Request,
    ctx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const auth = await resolveKey(request);
    if (!auth) {
      return apiError(
        "unauthorized",
        "Provide a valid API key: Authorization: Bearer ort_…",
        401,
      );
    }
    if (opts.scope && !auth.scopes.includes(opts.scope)) {
      return apiError("insufficient_scope", `This key lacks the '${opts.scope}' scope.`, 403);
    }
    try {
      const params = await ctx.params;
      return await handler(auth, request, params ?? {});
    } catch (e) {
      if (e instanceof ApiHttpError) return apiError(e.code, e.message, e.status);
      console.error("API handler error:", e);
      return apiError("server_error", "Something went wrong.", 500);
    }
  };
}

/** Throw to return a specific HTTP error from inside a handler. */
export class ApiHttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Parse a JSON body, throwing a 400 on malformed input. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    throw new ApiHttpError(400, "invalid_json", "Request body must be valid JSON.");
  }
}
