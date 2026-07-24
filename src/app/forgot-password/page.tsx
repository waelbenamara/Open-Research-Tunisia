import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto w-full max-w-[440px] px-8 py-16">
      <div className="mb-8">
        <div className="eyebrow mb-2" style={{ color: "#8a3325" }}>
          Account recovery
        </div>
        <h1 className="font-serif text-[32px] font-medium leading-tight">Forgot your password?</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">
          Enter the email you signed up with and we&apos;ll send you a link to set a new one.
        </p>
      </div>
      <ForgotPasswordForm />
      <div className="mt-6 border-t border-line pt-5 text-[13.5px] text-ink-4">
        Remembered it after all? <Link href="/login">Back to sign in</Link>
      </div>
    </div>
  );
}
