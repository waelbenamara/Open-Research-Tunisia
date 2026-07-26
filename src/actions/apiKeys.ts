"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/notify";
import { generateApiKey } from "@/lib/apiAuth";

const MAX_KEYS = 20;

export type CreateKeyState =
  | { error: string }
  | { rawKey: string; name: string }
  | null;

/** Create a new API key. The raw token is returned ONCE for the user to copy;
 *  only its hash is stored. */
export async function createApiKeyAction(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim().slice(0, 60) || "API key";
  const writable = formData.get("write") === "on";
  const scopes = writable ? "read,write" : "read";

  const active = await db.apiKey.count({ where: { userId: user.id, revokedAt: null } });
  if (active >= MAX_KEYS) {
    return { error: `You already have ${MAX_KEYS} active keys. Revoke one first.` };
  }

  const { raw, hashedKey, prefix } = generateApiKey();
  await db.apiKey.create({
    data: { userId: user.id, name, hashedKey, prefix, scopes },
  });
  await audit(user.id, "APIKEY_CREATE", "User", user.id, name);

  revalidatePath("/settings/api-keys");
  return { rawKey: raw, name };
}

export async function revokeApiKeyAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("keyId"));
  const key = await db.apiKey.findUnique({ where: { id }, select: { userId: true, name: true } });
  if (!key || key.userId !== user.id) throw new Error("FORBIDDEN");

  await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit(user.id, "APIKEY_REVOKE", "User", user.id, key.name);
  revalidatePath("/settings/api-keys");
}
