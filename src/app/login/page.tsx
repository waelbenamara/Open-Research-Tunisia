import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { FormError } from "@/components/ui";
import { OAuthButtons } from "@/components/OAuthButtons";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

const OAUTH_ERRORS: Record<string, string> = {
  oauth_unconfigured: "That sign-in method isn't available yet.",
  oauth_denied: "Sign-in was cancelled.",
  oauth_state: "That sign-in attempt expired. Please try again.",
  oauth_failed: "Something went wrong signing you in. Please try again.",
  oauth_no_email:
    "Your account has no email we can use. On GitHub, make a verified email public, or sign up with email.",
  oauth_unverified: "Your provider email isn't verified. Verify it, or sign up with email.",
  oauth_suspended: "This account has been suspended. Contact an administrator.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { next, error } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-[440px] px-4 sm:px-8 py-16">
      <div className="mb-8">
        <div className="eyebrow mb-2" style={{ color: "#8a3325" }}>
          Welcome back
        </div>
        <h1 className="font-serif text-[32px] font-medium leading-tight">Sign in</h1>
      </div>
      {error ? (
        <div className="mb-4">
          <FormError>{OAUTH_ERRORS[error] ?? "Please try again."}</FormError>
        </div>
      ) : null}
      <LoginForm next={next} />
      <div className="mt-5">
        <OAuthButtons context="login" />
      </div>
      <div className="mt-6 border-t border-line pt-5 text-[13.5px] text-ink-4">
        New here? <Link href="/register">Create an account</Link> — it takes a minute and it&apos;s free.
      </div>

      {/* Seeded-account helper — DEV ONLY. Never rendered in production, so
          demo credentials can't leak on the live site. */}
      {process.env.NODE_ENV !== "production" ? (
        <div className="mt-8 border border-line bg-tint px-5 py-4 text-[12.5px] leading-relaxed text-ink-4">
          <div className="mb-1.5 font-semibold text-ink">Demo accounts (local dev only)</div>
          <div>
            <code>admin@ort.tn</code> · admin console
          </div>
          <div>
            <code>amine@ort.tn</code> · project lead
          </div>
          <div>
            <code>yasmine@ort.tn</code> · contributor
          </div>
          <div className="mt-1.5">
            Password for all: <code>password123</code>
          </div>
        </div>
      ) : null}
    </div>
  );
}
