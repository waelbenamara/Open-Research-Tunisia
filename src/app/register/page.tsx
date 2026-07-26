import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OAuthButtons } from "@/components/OAuthButtons";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Join" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 sm:px-8 py-16">
      <div className="mb-8">
        <div className="eyebrow mb-2" style={{ color: "#8a3325" }}>
          An open initiative
        </div>
        <h1 className="font-serif text-[32px] font-medium leading-tight balance">
          Join real research — no title required.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-3 pretty">
          Anyone can contribute here: students, professionals, the self-taught. What matters is that
          you show up and do the work.
        </p>
      </div>
      <RegisterForm />
      <div className="mt-5">
        <OAuthButtons context="register" />
      </div>
      <div className="mt-6 border-t border-line pt-5 text-[13.5px] text-ink-4">
        Already a member? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
