"use client";

import { useState, type ReactNode } from "react";

export function Collapse({
  label,
  children,
  align = "end",
}: {
  label: string;
  children: ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2.5">
      <div className={`flex ${align === "end" ? "justify-end" : "justify-start"}`}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer border border-brick bg-card px-4 py-2 text-[13px] font-semibold text-brick hover:bg-brick-tint"
        >
          {open ? "Cancel" : label}
        </button>
      </div>
      {open ? (
        <div className="animate-fade-up mt-3 border border-line bg-card p-5">{children}</div>
      ) : null}
    </div>
  );
}

/** Same thing, but the panel stays open after a server action reloads the page. */
export function Details({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mb-3 border border-line bg-card">
      <summary className="cursor-pointer select-none px-5 py-3 text-[13px] font-semibold text-brick">
        {label}
      </summary>
      <div className="border-t border-line-soft p-5">{children}</div>
    </details>
  );
}
