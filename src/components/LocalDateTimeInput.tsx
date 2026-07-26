"use client";

import { useEffect, useState } from "react";

/**
 * A datetime picker whose value is entered in the VIEWER'S local timezone but
 * submitted as a UTC ISO string — so a time a facilitator picks is stored as
 * the instant they meant, not reinterpreted in the server's timezone.
 *
 * The visible <input type="datetime-local"> has no name (so it isn't
 * submitted); a hidden field carries the UTC ISO, computed in the browser where
 * the local timezone is known. On edit, `defaultISO` is converted back to a
 * local wall-clock value for display.
 */
export function LocalDateTimeInput({
  name,
  defaultISO,
  required,
  className,
}: {
  name: string;
  defaultISO?: string | null;
  required?: boolean;
  className?: string;
}) {
  const [local, setLocal] = useState("");

  // Fill from the stored UTC value after mount (keeps SSR and first client
  // render identical — both empty — so there's no hydration mismatch).
  useEffect(() => {
    if (!defaultISO) return;
    const d = new Date(defaultISO);
    if (isNaN(d.getTime())) return;
    const p = (n: number) => String(n).padStart(2, "0");
    setLocal(
      `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`,
    );
  }, [defaultISO]);

  let iso = "";
  if (local) {
    const d = new Date(local); // parsed as the browser's local time
    if (!isNaN(d.getTime())) iso = d.toISOString(); // → UTC
  }

  return (
    <>
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        required={required}
        className={className}
        suppressHydrationWarning
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
