import "server-only";
import { Google, GitHub } from "arctic";
import { db } from "./db";
import { avatarColor } from "./format";

/**
 * OAuth sign-in, layered on top of the existing session system.
 *
 * arctic handles only the provider-specific OAuth2 handshake. Once we have a
 * verified email + profile, we find-or-create-or-link a User and hand off to the
 * same createSession() the password flow uses — so roles, permissions and
 * DB-backed sessions are identical no matter how someone signed in.
 *
 * Providers are configured entirely from env; an unconfigured provider is simply
 * hidden and its routes return 503, so the app runs fine with none set.
 */

export type ProviderName = "google" | "github";

export type OAuthProfile = {
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
};

export function providerEnabled(name: ProviderName): boolean {
  if (name === "google") return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function enabledProviders() {
  return {
    google: providerEnabled("google"),
    github: providerEnabled("github"),
  };
}

/** The callback URL must exactly match what's registered in the provider console. */
export function callbackUrl(origin: string, name: ProviderName) {
  return `${origin}/api/auth/${name}/callback`;
}

export function googleClient(origin: string) {
  return new Google(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    callbackUrl(origin, "google"),
  );
}

export function githubClient(origin: string) {
  return new GitHub(
    process.env.GITHUB_CLIENT_ID!,
    process.env.GITHUB_CLIENT_SECRET!,
    callbackUrl(origin, "github"),
  );
}

/* ── Fetch the profile from each provider ───────────────── */

export async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Could not read your Google profile.");
  const p = (await res.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    picture?: string;
  };
  return {
    providerAccountId: p.sub,
    email: p.email ?? null,
    emailVerified: !!p.email_verified,
    name: p.name || p.given_name || (p.email ? p.email.split("@")[0] : "New member"),
    avatarUrl: p.picture ?? null,
  };
}

export async function fetchGithubProfile(accessToken: string): Promise<OAuthProfile> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "open-research-tunisia",
  };
  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) throw new Error("Could not read your GitHub profile.");
  const u = (await userRes.json()) as {
    id: number;
    login: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string;
  };

  // GitHub often omits the email from /user; ask for the verified primary one.
  let email = u.email ?? null;
  let emailVerified = false;
  const emailRes = await fetch("https://api.github.com/user/emails", { headers });
  if (emailRes.ok) {
    const emails = (await emailRes.json()) as {
      email: string;
      primary: boolean;
      verified: boolean;
    }[];
    const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
    if (primary) {
      email = primary.email;
      emailVerified = true;
    }
  }

  return {
    providerAccountId: String(u.id),
    email,
    emailVerified,
    name: u.name || u.login || "New member",
    avatarUrl: u.avatar_url ?? null,
  };
}

/* ── Resolve the profile to a user ──────────────────────── */

export type ResolveResult =
  | { ok: true; userId: string; isNew: boolean }
  | { ok: false; reason: "no_email" | "unverified" | "suspended" };

/**
 * Find-or-create-or-link.
 *
 * Linking to an existing password account happens only on a *verified* provider
 * email — otherwise a provider that let a user claim an unverified address could
 * be used to take over an account. Google and GitHub both verify, so in practice
 * this links cleanly; we just refuse to guess when verification is missing.
 */
export async function resolveOAuthUser(
  provider: ProviderName,
  profile: OAuthProfile,
): Promise<ResolveResult> {
  // 1. Already linked → straight in.
  const existing = await db.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId },
    },
    include: { user: { select: { id: true, suspended: true } } },
  });
  if (existing) {
    if (existing.user.suspended) return { ok: false, reason: "suspended" };
    return { ok: true, userId: existing.user.id, isNew: false };
  }

  if (!profile.email) return { ok: false, reason: "no_email" };
  if (!profile.emailVerified) return { ok: false, reason: "unverified" };

  const email = profile.email.toLowerCase();

  // 2. Same verified email as an existing account → link.
  const byEmail = await db.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.suspended) return { ok: false, reason: "suspended" };
    await db.oAuthAccount.create({
      data: { provider, providerAccountId: profile.providerAccountId, userId: byEmail.id },
    });
    // Backfill an avatar if they never set one.
    if (!byEmail.avatarUrl && profile.avatarUrl) {
      await db.user.update({ where: { id: byEmail.id }, data: { avatarUrl: profile.avatarUrl } });
    }
    return { ok: true, userId: byEmail.id, isNew: false };
  }

  // 3. Brand-new account. No password; code-of-conduct captured on next screen.
  const user = await db.user.create({
    data: {
      email,
      name: profile.name,
      passwordHash: null,
      avatarColor: avatarColor(profile.name),
      avatarUrl: profile.avatarUrl,
      emailVerified: true,
      oauthAccounts: {
        create: { provider, providerAccountId: profile.providerAccountId },
      },
    },
  });

  await db.notification.create({
    data: {
      userId: user.id,
      type: "WELCOME",
      title: "Welcome to Open Research Tunisia",
      body: "Add your skills to your profile so project leads can find you, then browse projects that are recruiting.",
      link: "/profile/edit",
    },
  });

  return { ok: true, userId: user.id, isNew: true };
}
