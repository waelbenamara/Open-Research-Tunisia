"use client";

import { useActionState, useState } from "react";
import { createApiKeyAction } from "@/actions/apiKeys";
import { Button, Field, FormError } from "@/components/ui";

export function CreateApiKey() {
  const [state, action, pending] = useActionState(createApiKeyAction, null);
  const [copied, setCopied] = useState(false);

  const created = state && "rawKey" in state ? state : null;

  if (created) {
    return (
      <div className="border border-olive bg-olive-tint/40 p-5">
        <div className="text-[13.5px] font-semibold text-ink">
          Key “{created.name}” created — copy it now
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-4">
          This is the only time the full key is shown. Store it somewhere safe; if you lose it,
          revoke it and make a new one.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap border border-line bg-card px-3 py-2 text-[12.5px]">
            {created.rawKey}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(created.rawKey).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="shrink-0 cursor-pointer border-none bg-brick px-4 py-2 text-[12.5px] font-semibold"
            style={{ color: "#faf8f3" }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3.5 border border-line bg-card p-5">
      <FormError>{state && "error" in state ? state.error : undefined}</FormError>
      <Field label="Key name" hint="so you recognise it later — e.g. “my research agent”">
        <input name="name" required placeholder="My agent" maxLength={60} />
      </Field>
      <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-normal">
        <input type="checkbox" name="write" defaultChecked className="!w-auto" />
        Allow writes (create/update projects & tasks). Uncheck for a read-only key.
      </label>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create key"}
        </Button>
      </div>
    </form>
  );
}
