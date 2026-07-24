"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({
  defaultValue = "",
  filter = "all",
  area = "",
}: {
  defaultValue?: string;
  filter?: string;
  area?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filter && filter !== "all") params.set("filter", filter);
    if (area) params.set("area", area);
    if (q.trim()) params.set("q", q.trim());
    const s = params.toString();
    router.push(s ? `/?${s}` : "/");
  }

  return (
    <form onSubmit={submit} className="flex items-center">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search projects, workshops, topics…"
        aria-label="Search"
        className="!w-[260px] !py-1.5 !text-[13px]"
      />
    </form>
  );
}
