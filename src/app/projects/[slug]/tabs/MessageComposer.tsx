"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MentionInput } from "@/components/MentionInput";
import { postMessageAction } from "@/actions/projects";

export function MessageComposer({
  projectId,
  parentId,
  placeholder,
  autoFocus,
  onDone,
}: {
  projectId: string;
  parentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [k, setK] = useState(0);

  async function submit() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("projectId", projectId);
      if (parentId) fd.set("parentId", parentId);
      fd.set("body", text);
      await postMessageAction(fd);
      setBody("");
      setK((n) => n + 1);
      router.refresh();
      onDone?.();
    } catch {
      /* keep text */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-end gap-2">
      <MentionInput
        key={k}
        onChange={setBody}
        onSubmit={submit}
        rows={1}
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Write a message…  @ to mention"}
        className="!m-0 max-h-[140px] w-full resize-none !py-2.5 !text-[14px]"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !body.trim()}
        className="shrink-0 cursor-pointer whitespace-nowrap border-none bg-brick px-[18px] py-2.5 text-[13.5px] font-semibold hover:bg-brick-dark disabled:opacity-40"
        style={{ color: "#faf8f3" }}
      >
        Post
      </button>
    </div>
  );
}
