"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/actions/auth";
import { Button, Field, FormError, FormSuccess } from "@/components/ui";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);

  if (state?.success) {
    return <FormSuccess>{state.success}</FormSuccess>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError>{state?.error}</FormError>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </Field>
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Sending…" : "Email me a reset link"}
      </Button>
    </form>
  );
}
