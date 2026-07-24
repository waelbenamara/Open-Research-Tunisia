"use client";

import { useActionState } from "react";
import { requestPostingRightsAction } from "@/actions/auth";
import { Button, Field, FormError, FormSuccess } from "@/components/ui";

export function PostingRequestForm() {
  const [state, action, pending] = useActionState(requestPostingRightsAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError>{state?.error}</FormError>
      <FormSuccess>{state?.success}</FormSuccess>

      <Field label="What project would you like to post?">
        <input
          name="proposal"
          required
          placeholder="Antibiotic resistance surveillance in community pharmacies"
        />
      </Field>

      <Field
        label="Tell us about you and the plan"
        hint="background, why this matters, what contributors would actually do"
      >
        <textarea
          name="motivation"
          rows={6}
          required
          placeholder="Who are you, what's the research question, and what kind of help do you need? Be concrete about the roles you'd open — that's what we look at."
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </form>
  );
}
