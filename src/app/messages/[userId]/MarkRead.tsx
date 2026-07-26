"use client";

import { useEffect } from "react";
import { markThreadReadAction } from "@/actions/messages";

/**
 * Marks the open thread's incoming messages as read on mount, then refreshes
 * the header's unread badge. Rendered once per thread page.
 */
export function MarkRead({ otherId }: { otherId: string }) {
  useEffect(() => {
    markThreadReadAction(otherId).catch(() => {});
  }, [otherId]);
  return null;
}
