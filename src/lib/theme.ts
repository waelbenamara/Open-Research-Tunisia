/** Colour mappings lifted from the Claude Design source of truth. */

export const STAGE_COLORS: Record<string, [string, string]> = {
  Proposal: ["#efe9dc", "#6e675a"],
  Recruiting: ["#f4ead2", "#7a5b16"],
  Active: ["#e4ecdb", "#3e5730"],
  Writing: ["#e8e3f0", "#4f4370"],
  Published: ["#8a3325", "#faf8f3"],
  OnHold: ["#efe9dc", "#6e675a"],
  Archived: ["#efe9dc", "#9a927f"],
};

export const KIND_COLORS: Record<string, [string, string]> = {
  PDF: ["#f7ece8", "#8a3325"],
  VIDEO: ["#e8e3f0", "#4f4370"],
  DATA: ["#e4ecdb", "#3e5730"],
  DOC: ["#f2eee3", "#57503f"],
  LINK: ["#f4ead2", "#7a5b16"],
  SLIDES: ["#f4ead2", "#7a5b16"],
  CODE: ["#e8e3f0", "#4f4370"],
};

export const STATUS_COLORS: Record<string, [string, string, string]> = {
  // [bg, fg, label]
  PENDING: ["#f4ead2", "#7a5b16", "Pending"],
  UNDER_REVIEW: ["#f4ead2", "#7a5b16", "Under review"],
  ACCEPTED: ["#e4ecdb", "#3e5730", "Accepted"],
  DECLINED: ["#f0ddd6", "#8a3325", "Declined"],
  WITHDRAWN: ["#efe9dc", "#6e675a", "Withdrawn"],
  APPROVED: ["#e4ecdb", "#3e5730", "Approved"],
  DENIED: ["#f0ddd6", "#8a3325", "Denied"],
  ENROLLED: ["#e4ecdb", "#3e5730", "Enrolled"],
  WAITLIST: ["#f4ead2", "#7a5b16", "Waitlisted"],
  COMPLETED: ["#8a3325", "#faf8f3", "Completed"],
  DROPPED: ["#efe9dc", "#6e675a", "Dropped"],
};

export const CONTRIB_TAG_COLORS: Record<string, [string, string]> = {
  DATA: ["#e4ecdb", "#3e5730"],
  ANALYSIS: ["#e4ecdb", "#3e5730"],
  NOTES: ["#f2eee3", "#57503f"],
  REVIEW: ["#f7ece8", "#8a3325"],
  WRITING: ["#f7ece8", "#8a3325"],
  CODE: ["#e8e3f0", "#4f4370"],
  WORKSHOP: ["#e8e3f0", "#4f4370"],
  ADMIN: ["#f4ead2", "#7a5b16"],
};

export const TASK_STATUS_COLORS: Record<string, [string, string, string]> = {
  OPEN: ["#f2eee3", "#57503f", "Open"],
  IN_PROGRESS: ["#f4ead2", "#7a5b16", "In progress"],
  IN_REVIEW: ["#e8e3f0", "#4f4370", "In review"],
  DONE: ["#e4ecdb", "#3e5730", "Done"],
};

export const ROLE_COLORS: Record<string, [string, string]> = {
  ADMIN: ["#211d16", "#faf8f3"],
  LEAD: ["#f7ece8", "#8a3325"],
  MEMBER: ["#f2eee3", "#57503f"],
  MAINTAINER: ["#e8e3f0", "#4f4370"],
  CONTRIBUTOR: ["#f2eee3", "#57503f"],
  REVIEWER: ["#e4ecdb", "#3e5730"],
};

export function stagePill(stage: string) {
  const [bg, fg] = STAGE_COLORS[stage] ?? STAGE_COLORS.Proposal;
  return { bg, fg };
}

export function statusPill(status: string) {
  const [bg, fg, label] = STATUS_COLORS[status] ?? ["#efe9dc", "#6e675a", status];
  return { bg, fg, label };
}
