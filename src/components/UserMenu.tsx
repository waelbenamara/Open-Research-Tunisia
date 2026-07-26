"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./ui";
import { logoutAction } from "@/actions/auth";

export function UserMenu({
  name,
  color,
  src,
  role,
  canPost,
}: {
  name: string;
  color: string;
  src?: string | null;
  role: string;
  canPost: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const item =
    "block px-4 py-2.5 text-[13.5px] text-ink-3 no-underline hover:bg-tint hover:text-ink hover:no-underline";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-none bg-transparent p-0"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={name} color={color} src={src} size={32} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[42px] w-[228px] border border-line bg-card shadow-[0_12px_32px_rgba(33,29,22,0.14)]"
        >
          <div className="border-b border-line-soft px-4 py-3">
            <div className="text-[13.5px] font-semibold text-ink">{name}</div>
            <div className="mt-0.5 text-[12px] text-muted">
              {role === "ADMIN" ? "Administrator" : canPost ? "Project lead" : "Contributor"}
            </div>
          </div>
          <Link href="/profile" className={item} onClick={() => setOpen(false)}>
            My profile
          </Link>
          <Link href="/dashboard" className={item} onClick={() => setOpen(false)}>
            My work
          </Link>
          <Link href="/profile/edit" className={item} onClick={() => setOpen(false)}>
            Edit profile
          </Link>
          <Link href="/settings/api-keys" className={item} onClick={() => setOpen(false)}>
            API keys
          </Link>
          {canPost || role === "ADMIN" ? (
            <>
              <Link href="/projects/new" className={item} onClick={() => setOpen(false)}>
                Post a project
              </Link>
              <Link href="/workshops/new" className={item} onClick={() => setOpen(false)}>
                Post a workshop
              </Link>
            </>
          ) : (
            <Link href="/request-posting-rights" className={item} onClick={() => setOpen(false)}>
              Request posting rights
            </Link>
          )}
          <form action={logoutAction} className="border-t border-line-soft">
            <button
              type="submit"
              className="w-full cursor-pointer border-none bg-transparent px-4 py-2.5 text-left text-[13.5px] text-ink-4 hover:bg-tint hover:text-brick"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
