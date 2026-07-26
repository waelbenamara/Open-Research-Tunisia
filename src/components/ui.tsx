import Link from "next/link";
import type { ReactNode } from "react";
import { initials as toInitials } from "@/lib/format";

/* ── Avatar ─────────────────────────────────────────────── */

export function Avatar({
  name,
  color,
  src,
  size = 36,
  className = "",
}: {
  name: string;
  color?: string | null;
  /** Optional photo URL — falls back to colored initials when absent. */
  src?: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  const fontSize = size <= 28 ? 10.5 : size <= 36 ? 12 : size <= 44 ? 13 : size * 0.34;
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-paper ${className}`}
      style={{
        width: size,
        height: size,
        background: color || "#8a3325",
        fontSize,
        color: "#faf8f3",
      }}
      aria-hidden
    >
      {toInitials(name)}
    </div>
  );
}

/* ── Pills & badges ─────────────────────────────────────── */

export function Pill({
  children,
  bg,
  fg,
  className = "",
}: {
  children: ReactNode;
  bg: string;
  fg: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="bg-tint px-[9px] py-[3px] text-[11.5px] text-ink-3">{children}</span>
  );
}

export function KindBadge({ kind, bg, fg }: { kind: string; bg: string; fg: string }) {
  return (
    <span
      className="min-w-[42px] px-2 py-1 text-center text-[10.5px] font-bold tracking-[0.08em]"
      style={{ background: bg, color: fg }}
    >
      {kind}
    </span>
  );
}

/* ── Layout ─────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
  hover = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`border border-line bg-card ${
        hover ? "transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[0_2px_12px_rgba(60,45,20,0.07)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow mb-3 ${className}`}>{children}</div>;
}

export function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`animate-fade-up mx-auto w-full max-w-[1200px] px-4 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function Breadcrumb({ href, label, current }: { href: string; label: string; current: string }) {
  return (
    <div className="mb-6 text-[13px] text-muted">
      <Link href={href} className="text-brick">
        ← {label}
      </Link>
      <span className="px-2">/</span>
      {current}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="border border-dashed border-line-input bg-card/50 px-6 py-10 text-center">
      <div className="text-[14px] font-semibold text-ink-3">{title}</div>
      {hint ? <div className="mt-1.5 text-[13px] text-muted">{hint}</div> : null}
    </div>
  );
}

/* ── Buttons ────────────────────────────────────────────── */

type BtnProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "affirm" | "danger";
  size?: "sm" | "md";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-55";

const BTN_VARIANTS: Record<string, string> = {
  primary: "border-none bg-brick text-paper hover:bg-brick-dark",
  affirm: "border-none bg-olive text-paper hover:bg-olive-dark",
  secondary:
    "border border-brick bg-card text-brick hover:bg-brick-tint",
  ghost:
    "border border-line-input bg-card text-ink-4 hover:border-brick hover:text-brick",
  danger: "border border-line-input bg-card text-ink-4 hover:border-brick hover:text-brick",
};

const BTN_SIZES: Record<string, string> = {
  sm: "px-4 py-2 text-[12.5px]",
  md: "px-5 py-2.5 text-[13.5px]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: BtnProps) {
  return (
    <button
      className={`${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      style={{ color: variant === "primary" || variant === "affirm" ? "#faf8f3" : undefined }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${BTN_BASE} ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} no-underline hover:no-underline ${className}`}
      style={{ color: variant === "primary" ? "#faf8f3" : undefined }}
    >
      {children}
    </Link>
  );
}

/* ── Forms ──────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label>
        {label}
        {hint ? <span className="ml-1.5 font-normal text-muted">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="bg-brick-tint px-3.5 py-2.5 text-[13px] text-brick" role="alert">
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="bg-olive-tint px-3.5 py-2.5 text-[13px] text-olive-dark" role="status">
      {children}
    </div>
  );
}

/* ── Stats ──────────────────────────────────────────────── */

export function StatCard({ n, label }: { n: ReactNode; label: string }) {
  return (
    <Card className="px-[22px] py-5">
      <div className="font-serif text-[30px] font-medium">{n}</div>
      <div className="mt-1 text-[12.5px] text-ink-4">{label}</div>
    </Card>
  );
}

export function ProgressBar({ pct, color = "#4d6b3c" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-line-soft">
      <div className="h-1.5" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}
