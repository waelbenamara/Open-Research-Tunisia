"use client";

import { useState } from "react";
import { Markdown } from "./Markdown";

/**
 * A textarea with a live Markdown preview. The textarea carries the form value
 * (`name`) at all times — in preview mode it's just visually hidden — so the
 * field submits normally with no hidden-input duplication.
 */
export function MarkdownField({
  name,
  defaultValue = "",
  rows = 8,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");

  const tabBtn = (key: "write" | "preview", label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className="cursor-pointer border-none bg-transparent px-2 py-1 text-[12.5px] font-semibold"
      style={{
        color: tab === key ? "#8a3325" : "#6e675a",
        borderBottom: `2px solid ${tab === key ? "#8a3325" : "transparent"}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 border-b border-line-soft">
        {tabBtn("write", "Write")}
        {tabBtn("preview", "Preview")}
        <div className="flex-1" />
        <a
          href="https://www.markdownguide.org/basic-syntax/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11.5px] text-muted"
        >
          Markdown supported
        </a>
      </div>

      <textarea
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        hidden={tab === "preview"}
      />

      {tab === "preview" ? (
        <div className="min-h-[120px] border border-line bg-card px-4 py-3">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <span className="text-[13px] text-muted">Nothing to preview yet.</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
