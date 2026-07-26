"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { EmojiPicker } from "@/components/EmojiPicker";
import { createPostAction } from "@/actions/feed";
import { compressImage } from "@/lib/compressImage";

type Opt = { id: string; title: string };
type Pic = { file: File; url: string };

const MAX_IMAGES = 6;

export function Composer({
  me,
  projects,
  workshops,
}: {
  me: { name: string; avatarColor: string; avatarSrc: string | null };
  projects: Opt[];
  workshops: Opt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pics, setPics] = useState<Pic[]>([]);
  const [link, setLink] = useState(""); // "project:id" | "workshop:id" | ""
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function grow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 280)}px`;
  }

  function insertEmoji(emoji: string) {
    setOpen(true);
    const ta = taRef.current;
    if (!ta) {
      setBody((b) => b + emoji);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + emoji + body.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
      grow();
    });
  }

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const room = MAX_IMAGES - pics.length;
    const chosen = Array.from(list).slice(0, Math.max(0, room));
    const compressed = await Promise.all(chosen.map((f) => compressImage(f)));
    setPics((prev) => [...prev, ...compressed.map((f) => ({ file: f, url: URL.createObjectURL(f) }))]);
  }

  function removePic(i: number) {
    setPics((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, j) => j !== i);
    });
  }

  function reset() {
    pics.forEach((p) => URL.revokeObjectURL(p.url));
    setBody("");
    setPics([]);
    setLink("");
    setOpen(false);
  }

  async function submit() {
    if ((!body.trim() && pics.length === 0) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("body", body.trim());
      if (link.startsWith("project:")) fd.set("linkedProjectId", link.slice(8));
      if (link.startsWith("workshop:")) fd.set("linkedWorkshopId", link.slice(9));
      pics.forEach((p) => fd.append("images", p.file));
      await createPostAction(fd);
      reset();
      router.refresh();
    } catch {
      setError("Couldn't post — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[16px] border border-line bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={me.name} color={me.avatarColor} src={me.avatarSrc} size={40} />
        <div className="min-w-0 flex-1">
          <textarea
            ref={taRef}
            value={body}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setBody(e.target.value);
              grow();
            }}
            rows={open ? 3 : 1}
            placeholder={`Share something with the community, ${me.name.split(" ")[0]}…`}
            aria-label="Write a post"
            className="!m-0 w-full resize-none !rounded-[12px] !border-line-input !bg-paper !px-3.5 !py-2.5 !text-[14px]"
          />

          {pics.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {pics.map((p, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`Attachment ${i + 1}`}
                    className="h-[84px] w-[84px] rounded-[10px] border border-line object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removePic(i)}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line bg-card text-[12px] text-ink-4 shadow-sm hover:text-brick"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {open && (projects.length > 0 || workshops.length > 0) ? (
            <div className="mt-3">
              <select
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="!m-0 max-w-full !py-1.5 !text-[12.5px] !text-ink-4"
                aria-label="Link a project or workshop"
              >
                <option value="">＋ Link a project or workshop (optional)</option>
                {projects.length ? (
                  <optgroup label="Projects">
                    {projects.map((p) => (
                      <option key={p.id} value={`project:${p.id}`}>
                        {p.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {workshops.length ? (
                  <optgroup label="Workshops">
                    {workshops.map((w) => (
                      <option key={w.id} value={`workshop:${w.id}`}>
                        {w.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>
          ) : null}

          {error ? <p className="mt-2 text-[12.5px] font-semibold text-brick">{error}</p> : null}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={pics.length >= MAX_IMAGES}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-transparent px-2.5 py-1.5 text-[13px] font-medium text-ink-4 hover:bg-tint hover:text-brick disabled:opacity-40"
              >
                <PhotoIcon /> Photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <EmojiPicker onPick={insertEmoji} />
              <span className="hidden text-[11.5px] text-muted sm:inline">Markdown supported</span>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={busy || (!body.trim() && pics.length === 0)}
              className="cursor-pointer rounded-full border-none px-5 py-2 text-[13px] font-semibold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #9a3b2b, #69241a)", color: "#faf8f3" }}
            >
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9.5" r="1.5" fill="currentColor" />
      <path d="M4 17l5-5 4 4 2.5-2.5L20 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
