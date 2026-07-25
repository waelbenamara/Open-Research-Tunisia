/** Extension of a stored file key like "supabase:ab12.pdf" or a filename. */
export function fileExt(pathOrName: string | null | undefined): string {
  return (pathOrName ?? "").split(".").pop()?.toLowerCase() ?? "";
}

/**
 * How a stored file can be shown in the browser, if at all.
 * SVG is deliberately excluded — inline SVG from user uploads can run scripts
 * in our origin, so it stays download-only.
 */
export function viewableKind(
  ext: string,
): "pdf" | "image" | "video" | "audio" | "text" | null {
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["mp3", "wav"].includes(ext)) return "audio";
  if (["txt", "md", "csv", "tsv", "json", "jsonl", "py", "r", "geojson"].includes(ext))
    return "text";
  return null;
}

/** The picture to show for a user: an uploaded photo wins over an OAuth one. */
export function avatarSrc(u: {
  id: string;
  avatarUrl?: string | null;
  avatarPath?: string | null;
}): string | null {
  if (u.avatarPath) return `/api/users/${u.id}/avatar`;
  return u.avatarUrl ?? null;
}

export function initials(name: string) {
  return name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mme|M\.)\s+/i, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_PALETTE = [
  "#8a3325",
  "#4d6b3c",
  "#4f4370",
  "#7a5b16",
  "#3d5a6b",
  "#6b3d5a",
];

export function avatarColor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function shortDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function monthYear(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function fullDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function dateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${fullDate(date)} · ${hh}:${mm}`;
}

export function relativeTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return fullDate(date);
}

export function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function fileSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function certCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ORT-${out.slice(0, 5)}-${out.slice(5)}`;
}
