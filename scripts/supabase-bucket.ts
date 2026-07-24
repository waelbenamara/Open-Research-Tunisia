/**
 * Creates the private Storage bucket the app uploads to, idempotently.
 * Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_STORAGE_BUCKET from .env.
 *
 *   npm run supabase:bucket
 */
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(); // Node reads .env — no dependency needed

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "resources";

async function main() {
  if (!url || !key || url.includes("<") || key.includes("<")) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { error } = await supabase.storage.createBucket(bucket, {
    public: false, // private — the app serves files via short-lived signed URLs
    fileSizeLimit: "25MB",
  });

  if (error && !/already exists/i.test(error.message)) {
    console.error(`Failed to create bucket "${bucket}": ${error.message}`);
    process.exit(1);
  }

  console.log(
    error
      ? `Bucket "${bucket}" already exists — leaving it as is.`
      : `Created private bucket "${bucket}".`,
  );
}

main();
