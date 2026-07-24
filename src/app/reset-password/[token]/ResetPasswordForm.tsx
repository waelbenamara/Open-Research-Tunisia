"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/actions/auth";
import { Button, Field, FormError } from "@/components/ui";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormError>{state?.error}</FormError>
      <Field label="New password">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </Field>
      <Field label="Confirm new password">
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Saving…" : "Set new password & sign in"}
      </Button>
    </form>
  );
}
