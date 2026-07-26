"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { EmojiPicker } from "@/components/EmojiPicker";
import { addCommentAction } from "@/actions/feed";

export function CommentForm({
  postId,
  me,
}: {
  postId: string;
  me: { name: string; avatarColor: string; avatarSrc: string | null };
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    if (!el) {
      setValue((v) => v + emoji);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + emoji + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function submit() {
    const body = value.trim();
    if (!body || busy) return;
    setBusy(true);
    setValue("");
    try {
      const fd = new FormData();
      fd.set("postId", postId);
      fd.set("body", body);
      await addCommentAction(fd);
      router.refresh();
    } catch {
      setValue(body); // restore on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <Avatar name={me.name} color={me.avatarColor} src={me.avatarSrc} size={28} />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Write a comment…"
        aria-label="Write a comment"
        className="!m-0 flex-1 !rounded-full !border-line-input !bg-paper !py-2 !text-[13px]"
      />
      <EmojiPicker onPick={insertEmoji} align="right" />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !value.trim()}
        className="cursor-pointer rounded-full border-none bg-brick px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-40"
        style={{ color: "#faf8f3" }}
      >
        Send
      </button>
    </div>
  );
}
