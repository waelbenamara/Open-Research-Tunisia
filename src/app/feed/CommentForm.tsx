"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { MentionInput } from "@/components/MentionInput";
import { addCommentAction } from "@/actions/feed";

export function CommentForm({
  postId,
  me,
  parentId,
  placeholder,
  autoFocus,
  onDone,
}: {
  postId: string;
  me: { name: string; avatarColor: string; avatarSrc: string | null };
  parentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [k, setK] = useState(0); // bump to reset the mention input

  async function submit() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("postId", postId);
      if (parentId) fd.set("parentId", parentId);
      fd.set("body", text);
      await addCommentAction(fd);
      setBody("");
      setK((n) => n + 1);
      router.refresh();
      onDone?.();
    } catch {
      /* keep the text so nothing is lost */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-2 pt-1">
      <Avatar name={me.name} color={me.avatarColor} src={me.avatarSrc} size={parentId ? 24 : 28} />
      <div className="flex flex-1 items-end gap-2">
        <MentionInput
          key={k}
          onChange={setBody}
          onSubmit={submit}
          rows={1}
          autoFocus={autoFocus}
          placeholder={placeholder ?? "Write a comment…  @ to mention"}
          className="!m-0 max-h-[120px] w-full resize-none !rounded-[16px] !border-line-input !bg-paper !py-2 !text-[13px]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !body.trim()}
          className="shrink-0 cursor-pointer rounded-full border-none bg-brick px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-40"
          style={{ color: "#faf8f3" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
