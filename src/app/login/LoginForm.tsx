"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Button, Field, FormError } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <FormError>{state?.error}</FormError>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required autoComplete="current-password" />
      </Field>
      <div className="-mt-2 text-right text-[12.5px]">
        <Link href="/forgot-password" className="text-ink-4">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
