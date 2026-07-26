import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-sand">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-8 py-7 text-[13px] text-ink-4">
        <span className="font-serif font-semibold text-ink">Open Research Tunisia</span>
        <span>·</span>
        <span>Open science, open doors.</span>
        <div className="flex-1" />
        <Link href="/code-of-conduct">Code of conduct</Link>
        <Link href="/verify">Verify a certificate</Link>
        <Link href="/developers">Developers</Link>
        <Link href="/about">About</Link>
      </div>
    </footer>
  );
}
