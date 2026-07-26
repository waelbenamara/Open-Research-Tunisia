"use client";

import { useRef, useState } from "react";
import { sendDirectMessageAction } from "@/actions/messages";

export function Composer({
  recipientId,
  recipientName,
}: {
  recipientId: string;
  recipientName: string;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit() {
    const body = value.trim();
    if (!body || sending) return;
    setSending(true);
    const fd = new FormData();
    fd.set("recipientId", recipientId);
    fd.set("body", body);
    try {
      await sendDirectMessageAction(fd);
      setValue("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex items-end gap-2.5"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter makes a newline.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        placeholder={`Message ${recipientName}…`}
        aria-label={`Message ${recipientName}`}
        className="flex-1 resize-none"
      />
      <button
        type="submit"
        disabled={sending || !value.trim()}
        className="cursor-pointer whitespace-nowrap border-none bg-brick px-5 py-2.5 text-[13px] font-semibold disabled:opacity-40"
        style={{ color: "#faf8f3" }}
      >
        {sending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
