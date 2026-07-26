import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { UPLOAD_MAX_BYTES, extAllowed, uploadNamed, MIME_BY_EXT } from "./storage";
import { fileExt } from "./format";

export type StoredBlob = { hash: string; filename: string };

/**
 * Store a file with content-addressed deduplication.
 *
 * Hashes the bytes (SHA-256). If a blob with that hash already exists, we reuse
 * it — the file is NOT uploaded again. Otherwise we upload once, under the hash
 * as its object name, and record the blob. Either way the caller gets back a
 * hash to reference plus the original filename to display.
 *
 * Returns null for an empty file; throws on an oversized or disallowed type.
 */
export async function storeDedupedFile(file: File): Promise<StoredBlob | null> {
  if (!file || file.size === 0) return null;
  if (file.size > UPLOAD_MAX_BYTES) throw new Error("File is larger than 25 MB.");

  const ext = fileExt(file.name);
  if (!extAllowed(ext)) throw new Error(`Files of type .${ext || "?"} aren't accepted.`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");

  const existing = await db.fileBlob.findUnique({ where: { hash } });
  if (!existing) {
    const contentType = MIME_BY_EXT[ext] ?? file.type ?? "application/octet-stream";
    const storageKey = await uploadNamed(`${hash}.${ext}`, buffer, contentType);
    await db.fileBlob.create({
      data: { hash, storageKey, size: file.size, ext, contentType },
    });
  }

  return { hash, filename: file.name.slice(0, 200) };
}
