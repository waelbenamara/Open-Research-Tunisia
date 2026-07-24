"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const forbidden = error.message === "FORBIDDEN" || error.message === "UNAUTHENTICATED";

  return (
    <div className="mx-auto w-full max-w-[520px] px-8 py-24 text-center">
      <div className="eyebrow mb-3">{forbidden ? "Not allowed" : "Something broke"}</div>
      <h1 className="font-serif text-[30px] font-medium">
        {forbidden
          ? "You don't have permission for that."
          : "That didn't work."}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
        {forbidden
          ? "You may need to sign in, or ask the project lead for access."
          : "The error has been logged. Try again — if it keeps happening, tell an administrator."}
      </p>
      <div className="mt-6 flex justify-center gap-3 text-[14px]">
        <button
          onClick={reset}
          className="cursor-pointer border border-line-input bg-card px-4 py-2 text-[13.5px] font-semibold text-ink-4 hover:border-brick hover:text-brick"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border border-line-input bg-card px-4 py-2 text-[13.5px] font-semibold text-ink-4 no-underline hover:border-brick hover:text-brick hover:no-underline"
        >
          Back to Discover
        </Link>
      </div>
    </div>
  );
}
