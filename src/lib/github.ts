import "server-only";

export type SnapshotFile = { path: string; content: string | null; size: number; binary: boolean };
export type RepoSnapshot = {
  owner: string;
  repo: string;
  ref: string;
  commitSha: string;
  files: SnapshotFile[];
  totalBytes: number;
  truncated: boolean;
};

const MAX_FILES = 400;
const MAX_FILE_SIZE = 300 * 1024; // 300 KB per file
const MAX_TOTAL = 6 * 1024 * 1024; // 6 MB of text total
const CONCURRENCY = 8;
const NUL = String.fromCharCode(0);

const IGNORE_DIRS = [
  "node_modules/", ".git/", "dist/", "build/", ".next/", "out/", "vendor/",
  ".venv/", "venv/", "__pycache__/", ".cache/", "coverage/", "target/", "Pods/",
  ".idea/", ".vscode/", "bin/", "obj/",
];

const BINARY_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "bmp", "ico", "webp", "svg", "pdf", "zip", "gz",
  "tar", "rar", "7z", "woff", "woff2", "ttf", "otf", "eot", "mp3", "mp4", "mov",
  "avi", "webm", "wav", "exe", "dll", "so", "dylib", "class", "jar", "wasm",
  "bin", "dat", "pyc", "o", "a", "lib", "heic", "psd", "sketch", "ai",
]);

function extOf(path: string) {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** Shared with the ZIP importer: which paths to skip and the size caps. */
export function isIgnoredPath(path: string): boolean {
  return IGNORE_DIRS.some((d) => path.startsWith(d) || path.includes(`/${d}`));
}
export function isBinaryPath(path: string): boolean {
  return BINARY_EXTS.has(extOf(path));
}
export const CODE_CAPS = { MAX_FILES, MAX_FILE_SIZE, MAX_TOTAL, NUL };

/** Parse a GitHub repo URL (or "owner/repo") into its parts. */
export function parseRepoUrl(input: string): { owner: string; repo: string; ref?: string } | null {
  const s = input.trim();
  const short = s.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (short) return { owner: short[1], repo: short[2] };

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (!/(^|\.)github\.com$/.test(u.hostname)) return null;
  const parts = u.pathname.replace(/^\/+/, "").split("/");
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!owner || !repo) return null;
  let ref: string | undefined;
  if ((parts[2] === "tree" || parts[2] === "blob") && parts[3]) ref = parts[3];
  return { owner, repo, ref };
}

function ghHeaders() {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "open-research-tunisia",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Snapshot a public GitHub repo: tree + text file contents, within caps. */
export async function fetchRepoSnapshot(owner: string, repo: string, ref?: string): Promise<RepoSnapshot> {
  let useRef = ref;
  if (!useRef) {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders() });
    if (repoRes.status === 404) throw new Error("Repository not found — check the URL and that it's public.");
    if (!repoRes.ok) throw new Error(`GitHub error (${repoRes.status}). Try again shortly.`);
    useRef = (await repoRes.json()).default_branch as string;
  }

  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(useRef)}`,
    { headers: ghHeaders() },
  );
  if (commitRes.status === 404) throw new Error("Branch or repository not found — check the URL.");
  if (!commitRes.ok) throw new Error(`GitHub error (${commitRes.status}). Try again shortly.`);
  const commitSha = (await commitRes.json()).sha as string;

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
    { headers: ghHeaders() },
  );
  if (!treeRes.ok) throw new Error(`Couldn't read the repository tree (${treeRes.status}).`);
  const tree = await treeRes.json();

  const blobs: { path: string; size: number }[] = (tree.tree ?? [])
    .filter((e: { type: string }) => e.type === "blob")
    .map((e: { path: string; size?: number }) => ({ path: e.path, size: e.size ?? 0 }))
    .filter((b: { path: string }) => !IGNORE_DIRS.some((d) => b.path.startsWith(d) || b.path.includes(`/${d}`)));

  if (blobs.length === 0) throw new Error("No source files found in that repository.");
  blobs.sort((a, b) => a.path.localeCompare(b.path));

  let truncated = Boolean(tree.truncated);
  const chosen: { path: string; size: number }[] = [];
  let running = 0;
  for (const b of blobs) {
    if (chosen.length >= MAX_FILES) {
      truncated = true;
      break;
    }
    chosen.push(b);
    if (BINARY_EXTS.has(extOf(b.path)) || b.size > MAX_FILE_SIZE) continue;
    running += b.size;
    if (running > MAX_TOTAL) truncated = true;
  }

  let totalBytes = 0;
  const files = await mapPool(chosen, CONCURRENCY, async (b): Promise<SnapshotFile> => {
    const isBinary = BINARY_EXTS.has(extOf(b.path));
    if (isBinary || b.size > MAX_FILE_SIZE || totalBytes > MAX_TOTAL) {
      return { path: b.path, content: null, size: b.size, binary: isBinary };
    }
    try {
      const encodedPath = b.path.split("/").map(encodeURIComponent).join("/");
      const raw = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${encodedPath}`,
        { headers: { "User-Agent": "open-research-tunisia" } },
      );
      if (!raw.ok) return { path: b.path, content: null, size: b.size, binary: false };
      const text = await raw.text();
      // A NUL byte means it's really binary despite the extension.
      if (text.indexOf(NUL) !== -1) return { path: b.path, content: null, size: b.size, binary: true };
      totalBytes += text.length;
      return { path: b.path, content: text, size: b.size || text.length, binary: false };
    } catch {
      return { path: b.path, content: null, size: b.size, binary: false };
    }
  });

  return { owner, repo, ref: useRef, commitSha, files, totalBytes, truncated };
}
