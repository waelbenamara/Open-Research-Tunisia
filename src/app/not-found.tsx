import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[520px] px-4 sm:px-8 py-24 text-center">
      <div className="eyebrow mb-3">404</div>
      <h1 className="font-serif text-[32px] font-medium">That page doesn&apos;t exist.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
        The project or workshop may have been archived, or the link may be wrong.
      </p>
      <p className="mt-6 text-[14px]">
        <Link href="/">← Back to Discover</Link>
      </p>
    </div>
  );
}
