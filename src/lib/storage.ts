import "server-only";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * File storage, behind one interface.
 *
 * Driver is chosen from the environment:
 *   - `supabase` when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *   - `local`    otherwise (writes to ./storage/uploads)
 *
 * Local is fine for development and for a VPS with a persistent disk. It is NOT
 * safe on serverless hosts (Vercel, Netlify) — the filesystem is wiped on every
 * deploy, so uploads silently vanish. Set the Supabase vars before deploying there.
 *
 * Note that local files live OUTSIDE public/ on purpose. Anything under public/ is
 * served statically by Next with no auth check, which would make a TEAM-visibility
 * dataset readable by anyone who learned the URL. Every download goes through
 * /api/resources/[id]/download instead, which checks permission first.
 *
 * Keys are driver-prefixed ("local:…", "supabase:…") so files stored under one
 * driver keep resolving after you switch to another.
 */

const LOCAL_DIR = path.join(process.cwd(), "storage", "uploads");
const MAX_BYTES = 25 * 1024 * 1024;
const SIGNED_URL_TTL = 60 * 10; // seconds

const ALLOWED = new Set([
  "pdf", "doc", "docx", "odt", "txt", "md", "rtf",
  "csv", "tsv", "json", "jsonl", "xlsx", "xls", "parquet",
  "ppt", "pptx", "odp",
  "png", "jpg", "jpeg", "gif", "webp", "svg",
  "mp4", "webm", "mov", "mp3", "wav",
  "zip", "ipynb", "py", "r", "geojson",
]);

export type StoredFile = { filePath: string; fileSize: number; ext: string };

/** Content types for serving stored files — shared by the download/inline routes. */
export const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  jsonl: "application/x-ndjson",
  geojson: "application/geo+json",
  txt: "text/plain",
  md: "text/markdown",
  py: "text/plain",
  r: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  zip: "application/zip",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "resources";

// Treat leftover "<...>" placeholders as unset, so a half-filled .env
// falls back to local disk instead of trying to use a fake key.
const supabaseConfigured =
  !!SUPABASE_URL &&
  !!SUPABASE_KEY &&
  !SUPABASE_URL.includes("<") &&
  !SUPABASE_KEY.includes("<");

export const storageDriver: "supabase" | "local" = supabaseConfigured ? "supabase" : "local";

async function supabaseClient() {
  const { createClient } = await import("@supabase/supabase-js");
  // The service-role key bypasses RLS, so it must never reach the browser.
  // This module is server-only and every call sits behind an auth check.
  return createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { persistSession: false } });
}

/** Split "local:abc.pdf" into its driver and object name. */
function parseKey(key: string): { driver: string; name: string } | null {
  const i = key.indexOf(":");
  if (i === -1) return null;
  const name = key.slice(i + 1);
  // Defend against traversal even though names are generated UUIDs.
  if (!name || name.includes("/") || name.includes("..")) return null;
  return { driver: key.slice(0, i), name };
}

/** Persist an upload and return the key to store on the Resource row. */
export async function storeUpload(file: File): Promise<StoredFile | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error("File is larger than 25 MB.");

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED.has(ext)) throw new Error(`Files of type .${ext || "?"} aren't accepted.`);

  // Never trust the client filename for the stored path.
  const name = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (storageDriver === "supabase") {
    const supabase = await supabaseClient();
    const { error } = await supabase.storage.from(BUCKET).upload(name, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return { filePath: `supabase:${name}`, fileSize: file.size, ext };
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), buffer);
  return { filePath: `local:${name}`, fileSize: file.size, ext };
}

export type Resolved =
  | { kind: "redirect"; url: string }
  | { kind: "buffer"; body: Buffer; filename: string };

/**
 * Produce something the download route can return.
 * Supabase objects get a short-lived signed URL; the bucket itself stays private.
 * Local objects are streamed by the server, never exposed as a static path.
 */
export async function resolveDownload(key: string): Promise<Resolved | null> {
  const parsed = parseKey(key);
  if (!parsed) return null;

  if (parsed.driver === "local") {
    try {
      const body = await readFile(path.join(LOCAL_DIR, parsed.name));
      return { kind: "buffer", body, filename: parsed.name };
    } catch {
      return null;
    }
  }

  if (parsed.driver === "supabase") {
    const supabase = await supabaseClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(parsed.name, SIGNED_URL_TTL);
    if (error || !data) return null;
    return { kind: "redirect", url: data.signedUrl };
  }

  return null;
}

export async function deleteObject(key: string | null) {
  if (!key) return;
  const parsed = parseKey(key);
  if (!parsed) return;
  try {
    if (parsed.driver === "local") {
      await unlink(path.join(LOCAL_DIR, parsed.name));
      return;
    }
    const supabase = await supabaseClient();
    await supabase.storage.from(BUCKET).remove([parsed.name]);
  } catch {
    // A missing object shouldn't block deleting the database row.
  }
}

/** Best-guess resource kind from a file extension, so the badge is right by default. */
export function kindFromExt(ext: string): string {
  if (ext === "pdf") return "PDF";
  if (["mp4", "webm", "mov", "mp3", "wav"].includes(ext)) return "VIDEO";
  if (["csv", "tsv", "json", "jsonl", "xlsx", "xls", "parquet", "geojson"].includes(ext))
    return "DATA";
  if (["ppt", "pptx", "odp"].includes(ext)) return "SLIDES";
  if (["py", "r", "ipynb", "zip"].includes(ext)) return "CODE";
  return "DOC";
}
