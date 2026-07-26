import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { relativeTime, shortDate } from "@/lib/format";
import { revokeApiKeyAction } from "@/actions/apiKeys";
import { Breadcrumb, EmptyState, Shell } from "@/components/ui";
import { CreateApiKey } from "./CreateApiKey";

export const metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/api-keys");

  const keys = await db.apiKey.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Shell className="pb-24 pt-11">
      <Breadcrumb href="/profile" label="Profile" current="API keys" />
      <div className="mx-auto max-w-[720px]">
        <h1 className="font-serif text-[30px] font-medium">API keys</h1>
        <p className="mt-1.5 max-w-[60ch] text-[14px] leading-relaxed text-ink-3 pretty">
          Keys let you use the platform programmatically — connect an agent, script a workflow, or
          integrate another tool. A key acts as you, with your permissions. See the{" "}
          <Link href="/developers">developer documentation</Link> for endpoints and examples.
        </p>

        <div className="mt-7">
          <CreateApiKey />
        </div>

        <div className="mt-9">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Your keys
          </div>
          {keys.length === 0 ? (
            <EmptyState title="No keys yet." hint="Create one above to get started." />
          ) : (
            <div className="flex flex-col">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line-soft py-3.5"
                >
                  <div className="min-w-[200px] flex-1">
                    <div className="text-[14px] font-semibold text-ink">{k.name}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      <code>{k.prefix}…</code> · {k.scopes.includes("write") ? "read + write" : "read only"}{" "}
                      · created {shortDate(k.createdAt)} ·{" "}
                      {k.lastUsedAt ? `last used ${relativeTime(k.lastUsedAt)}` : "never used"}
                    </div>
                  </div>
                  <form action={revokeApiKeyAction}>
                    <input type="hidden" name="keyId" value={k.id} />
                    <button
                      type="submit"
                      className="cursor-pointer border border-line-input bg-card px-3.5 py-1.5 text-[12px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
