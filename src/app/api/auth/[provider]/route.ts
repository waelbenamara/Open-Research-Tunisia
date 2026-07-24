import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateState, generateCodeVerifier } from "arctic";
import {
  githubClient,
  googleClient,
  providerEnabled,
  type ProviderName,
} from "@/lib/oauth";

const TEN_MIN = 60 * 10;

function isProvider(v: string): v is ProviderName {
  return v === "google" || v === "github";
}

/** Kick off the OAuth handshake: build the provider URL and stash CSRF state. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const origin = new URL(request.url).origin;

  if (!isProvider(provider) || !providerEnabled(provider)) {
    return NextResponse.redirect(`${origin}/login?error=oauth_unconfigured`);
  }

  const state = generateState();
  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TEN_MIN,
  };

  jar.set("oauth_state", state, cookieOpts);

  let url: URL;
  if (provider === "google") {
    // Google requires PKCE; keep the verifier for the callback.
    const codeVerifier = generateCodeVerifier();
    jar.set("oauth_verifier", codeVerifier, cookieOpts);
    url = googleClient(origin).createAuthorizationURL(state, codeVerifier, [
      "openid",
      "profile",
      "email",
    ]);
  } else {
    url = githubClient(origin).createAuthorizationURL(state, ["read:user", "user:email"]);
  }

  return NextResponse.redirect(url);
}
