"use client";

import { useState } from "react";

// A broad but curated set — enough range for a feed post, not a full keyboard.
const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🙂",
  "😉", "😊", "😍", "😘", "😎", "🤩", "🥳", "🤔",
  "🤗", "🙃", "😌", "😢", "😭", "😡", "😱", "🥲",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "👀",
  "🔥", "✨", "⭐", "🎉", "🎊", "💯", "✅", "❌",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔",
  "🚀", "💡", "📌", "📊", "📚", "🧠", "🔬", "🎓",
  "☕", "🌱", "🌍", "⚡", "💬", "👋", "🤞", "😴",
];

/** A small 😊 button that opens an emoji grid and calls onPick with the choice. */
export function EmojiPicker({
  onPick,
  align = "left",
  className,
}: {
  onPick: (emoji: string) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Add emoji"
        onClick={() => setOpen((v) => !v)}
        className={
          className ??
          "grid h-8 w-8 cursor-pointer place-items-center rounded-full border-none bg-transparent text-[17px] opacity-80 transition-transform hover:scale-110 hover:opacity-100"
        }
      >
        😊
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`animate-popover absolute bottom-[38px] z-20 grid w-[288px] grid-cols-8 gap-0.5 rounded-[14px] border border-line bg-card p-2 shadow-lg ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-md border-none bg-transparent text-[18px] hover:bg-tint"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
