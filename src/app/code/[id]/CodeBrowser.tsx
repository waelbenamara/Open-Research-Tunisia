"use client";

import { useEffect, useMemo, useState } from "react";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github.css";

type FileEntry = { id: string; path: string; size: number; binary: boolean };

type Node = {
  name: string;
  path: string;
  type: "dir" | "file";
  file?: FileEntry;
  children: Map<string, Node>;
};

const LANG: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript", py: "python", rb: "ruby", go: "go",
  rs: "rust", java: "java", c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp",
  cs: "csharp", php: "php", swift: "swift", kt: "kotlin", scala: "scala",
  sh: "bash", bash: "bash", zsh: "bash", yml: "yaml", yaml: "yaml", json: "json",
  md: "markdown", css: "css", scss: "scss", less: "less", html: "xml", xml: "xml",
  vue: "xml", sql: "sql", r: "r", lua: "lua", dart: "dart", pl: "perl",
  ex: "elixir", exs: "elixir", toml: "ini", ini: "ini", diff: "diff", graphql: "graphql",
};

function langFor(path: string): string | null {
  const base = (path.split("/").pop() ?? "").toLowerCase();
  if (base === "dockerfile") return "dockerfile";
  if (base === "makefile") return "makefile";
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1) : "";
  return LANG[ext] ?? null;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(code: string, path: string): string {
  if (code.length > 200_000) return escapeHtml(code);
  try {
    const lang = langFor(path);
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

function buildTree(files: FileEntry[]): Node {
  const root: Node = { name: "", path: "", type: "dir", children: new Map() };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      if (!node.children.has(name)) {
        node.children.set(name, {
          name,
          path,
          type: isFile ? "file" : "dir",
          file: isFile ? f : undefined,
          children: new Map(),
        });
      }
      node = node.children.get(name)!;
    }
  }
  return root;
}

function sortedChildren(node: Node): Node[] {
  return [...node.children.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function CodeBrowser({ projectId, files }: { projectId: string; files: FileEntry[] }) {
  const root = useMemo(() => buildTree(files), [files]);

  // Default file: a root README, else the first file.
  const defaultFile = useMemo(() => {
    const readme = files.find((f) => /^readme(\.\w+)?$/i.test(f.path));
    return readme ?? files[0] ?? null;
  }, [files]);

  const [activeId, setActiveId] = useState<string | null>(defaultFile?.id ?? null);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Expand the ancestors of the default file.
    const set = new Set<string>();
    if (defaultFile) {
      const parts = defaultFile.path.split("/");
      for (let i = 1; i < parts.length; i++) set.add(parts.slice(0, i).join("/"));
    }
    return set;
  });
  const [content, setContent] = useState<{ path: string; content: string | null; binary: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false); // mobile drawer

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/code/files/${activeId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setContent({ path: d.path, content: d.content, binary: d.binary });
      })
      .catch(() => {
        if (!cancelled) setContent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const activePath = content?.path ?? files.find((f) => f.id === activeId)?.path ?? "";

  const highlighted = useMemo(() => {
    if (!content || content.binary || content.content == null) return null;
    return { html: highlight(content.content, content.path), lines: content.content.split("\n").length };
  }, [content]);

  function toggleDir(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function renderNodes(node: Node, depth: number): React.ReactNode {
    return sortedChildren(node).map((child) => {
      const pad = { paddingLeft: `${depth * 12 + 10}px` };
      if (child.type === "dir") {
        const open = expanded.has(child.path);
        return (
          <div key={child.path}>
            <button
              type="button"
              onClick={() => toggleDir(child.path)}
              style={pad}
              className="flex w-full cursor-pointer items-center gap-1.5 border-none bg-transparent py-1 pr-2 text-left text-[13px] text-ink-2 hover:bg-tint"
            >
              <span className="text-[10px] text-muted">{open ? "▾" : "▸"}</span>
              <span className="truncate font-medium">{child.name}</span>
            </button>
            {open ? renderNodes(child, depth + 1) : null}
          </div>
        );
      }
      const isActive = child.file?.id === activeId;
      return (
        <button
          key={child.path}
          type="button"
          onClick={() => {
            setActiveId(child.file!.id);
            setTreeOpen(false);
          }}
          style={pad}
          className={`flex w-full cursor-pointer items-center gap-1.5 border-none py-1 pr-2 text-left text-[13px] hover:bg-tint ${
            isActive ? "bg-brick-tint font-semibold text-brick" : "bg-transparent text-ink-3"
          }`}
        >
          <span className="text-[11px] text-muted">{child.file?.binary ? "▪" : "›"}</span>
          <span className="truncate">{child.name}</span>
        </button>
      );
    });
  }

  return (
    <div className="relative flex h-[calc(100dvh-220px)] min-h-[460px] overflow-hidden rounded-[14px] border border-line bg-card">
      {/* File tree */}
      <div
        className={`${treeOpen ? "absolute inset-y-0 left-0 z-20 w-[82%] max-w-[320px] shadow-2xl" : "hidden"} shrink-0 overflow-y-auto border-r border-line bg-sand/40 py-2 md:static md:z-auto md:block md:w-[286px] md:shadow-none`}
      >
        {renderNodes(root, 0)}
      </div>
      {treeOpen ? (
        <div className="absolute inset-0 z-10 bg-black/20 md:hidden" onClick={() => setTreeOpen(false)} />
      ) : null}

      {/* File view */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-line bg-paper/70 px-3 py-2">
          <button
            type="button"
            onClick={() => setTreeOpen(true)}
            className="cursor-pointer rounded-md border border-line bg-card px-2 py-1 text-[12px] font-semibold text-ink-3 md:hidden"
          >
            Files
          </button>
          <span className="truncate font-mono text-[12.5px] text-ink-3">{activePath || "Select a file"}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="p-6 text-[13px] text-muted">Loading…</div>
          ) : !content ? (
            <div className="p-6 text-[13px] text-muted">Select a file from the tree.</div>
          ) : content.binary || content.content == null ? (
            <div className="p-6 text-[13px] text-muted">
              Binary file — not shown.{" "}
              {files.find((f) => f.id === activeId) ? `(${files.find((f) => f.id === activeId)!.size} bytes)` : ""}
            </div>
          ) : highlighted ? (
            <div className="flex min-w-max font-mono text-[12.5px] leading-[1.55]">
              <div className="select-none border-r border-line-soft bg-sand/30 px-3 py-3 text-right text-muted">
                {Array.from({ length: highlighted.lines }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="hljs !m-0 overflow-visible !bg-transparent px-4 py-3">
                <code dangerouslySetInnerHTML={{ __html: highlighted.html }} />
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
