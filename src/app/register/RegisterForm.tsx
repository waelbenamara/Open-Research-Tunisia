"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/actions/auth";
import { Button, Field, FormError } from "@/components/ui";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError>{state?.error}</FormError>
      <Field label="Full name">
        <input name="name" required autoComplete="name" placeholder="Your full name" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </Field>
      <Field label="Password" hint="at least 8 characters">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Affiliation" hint="optional">
          <input name="affiliation" placeholder="University or organization" />
        </Field>
        <Field label="City" hint="optional">
          <input name="city" placeholder="Tunis" />
        </Field>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] font-normal leading-relaxed text-ink-3">
        <input type="checkbox" name="coc" className="mt-0.5 !w-auto" />
        <span>
          I agree to the <Link href="/code-of-conduct">code of conduct</Link> — respectful
          collaboration, honest reporting of results, and credit where credit is due.
        </span>
      </label>
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
