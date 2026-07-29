import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/notify";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/welcomeEmail";
import { notifyAdminsOfNewMember } from "@/lib/newMemberAlert";
import { appOrigin } from "@/lib/appUrl";
import {
  fetchGithubProfile,
  fetchGoogleProfile,
  githubClient,
  googleClient,
  providerEnabled,
  resolveOAuthUser,
  type ProviderName,
} from "@/lib/oauth";

function isProvider(v: string): v is ProviderName {
  return v === "google" || v === "github";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const origin = new URL(request.url).origin;
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${reason}`);

  if (!isProvider(provider) || !providerEnabled(provider)) return fail("oauth_unconfigured");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  const jar = await cookies();
  const storedState = jar.get("oauth_state")?.value;
  const verifier = jar.get("oauth_verifier")?.value;

  // Clear the handshake cookies regardless of outcome.
  jar.delete("oauth_state");
  jar.delete("oauth_verifier");

  if (providerError) return fail("oauth_denied");
  if (!code || !state || !storedState || state !== storedState) return fail("oauth_state");

  try {
    let accessToken: string;
    if (provider === "google") {
      if (!verifier) return fail("oauth_state");
      const tokens = await googleClient(origin).validateAuthorizationCode(code, verifier);
      accessToken = tokens.accessToken();
    } else {
      const tokens = await githubClient(origin).validateAuthorizationCode(code);
      accessToken = tokens.accessToken();
    }

    const profile =
      provider === "google"
        ? await fetchGoogleProfile(accessToken)
        : await fetchGithubProfile(accessToken);

    const result = await resolveOAuthUser(provider, profile);
    if (!result.ok) return fail(`oauth_${result.reason}`);

    await createSession(result.userId);
    await audit(result.userId, result.isNew ? "OAUTH_SIGNUP" : "OAUTH_LOGIN", "User", result.userId, provider);

    if (result.isNew) {
      // Emails must link to the canonical domain, not this request's origin.
      const emailOrigin = await appOrigin();
      // profile.email is guaranteed for a newly created account.
      if (profile.email) {
        await sendEmail(welcomeEmail(profile.name, profile.email.toLowerCase(), emailOrigin));
      }
      await notifyAdminsOfNewMember(
        { id: result.userId, name: profile.name, email: profile.email?.toLowerCase() ?? "" },
        emailOrigin,
        provider,
      );
      return NextResponse.redirect(`${origin}/accept-terms`);
    }

    // Returning user who signed up via OAuth before accepting the CoC.
    const user = await db.user.findUnique({
      where: { id: result.userId },
      select: { cocAcceptedAt: true },
    });
    return NextResponse.redirect(
      `${origin}${user?.cocAcceptedAt ? "/" : "/accept-terms"}`,
    );
  } catch {
    return fail("oauth_failed");
  }
}
