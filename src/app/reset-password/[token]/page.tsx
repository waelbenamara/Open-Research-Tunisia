import Link from "next/link";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { FormError } from "@/components/ui";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate up front so an expired link gets a clear message instead of a
  // form that fails on submit. The action re-checks on submit regardless.
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { email: true } } },
  });
  const valid = !!row && row.expiresAt >= new Date();

  return (
    <div className="mx-auto w-full max-w-[440px] px-4 sm:px-8 py-16">
      <div className="mb-8">
        <div className="eyebrow mb-2" style={{ color: "#8a3325" }}>
          Account recovery
        </div>
        <h1 className="font-serif text-[32px] font-medium leading-tight">Set a new password</h1>
        {valid ? (
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">
            Choose a new password for <strong>{row.user.email}</strong>. You&apos;ll be signed in
            here, and signed out on every other device.
          </p>
        ) : null}
      </div>

      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <FormError>
            This reset link is invalid or has expired — links are valid for one hour.
          </FormError>
          <div className="mt-5 text-[13.5px] text-ink-4">
            <Link href="/forgot-password">Request a new link</Link>
          </div>
        </>
      )}
    </div>
  );
}
