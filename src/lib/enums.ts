/** SQLite has no enums — these are the single source of truth for the string unions. */

export const PLATFORM_ROLES = ["MEMBER", "LEAD", "ADMIN"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PROJECT_STAGES = [
  "Proposal",
  "Recruiting",
  "Active",
  "Writing",
  "Published",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];
/** Off-pipeline states — shown as badges, not steps. */
export const OFF_PIPELINE_STAGES = ["OnHold", "Archived"] as const;
export const ALL_STAGES = [...PROJECT_STAGES, ...OFF_PIPELINE_STAGES];

export const PROJECT_ROLES = ["LEAD", "MAINTAINER", "CONTRIBUTOR", "REVIEWER"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const APPLICATION_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "ACCEPTED",
  "DECLINED",
  "WITHDRAWN",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const RESOURCE_KINDS = ["PDF", "VIDEO", "DATA", "DOC", "LINK", "SLIDES", "CODE"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const VISIBILITIES = ["PUBLIC", "MEMBERS", "TEAM"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CONTRIBUTION_TYPES = [
  "DATA",
  "ANALYSIS",
  "NOTES",
  "REVIEW",
  "WRITING",
  "CODE",
  "WORKSHOP",
  "ADMIN",
] as const;
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export const OUTPUT_TYPES = [
  "PREPRINT",
  "PAPER",
  "DATASET",
  "CODE",
  "POLICY_BRIEF",
  "POSTER",
  "REPORT",
] as const;

export const OUTPUT_STATUSES = ["DRAFT", "UNDER_REVIEW", "PUBLISHED"] as const;

export const WORKSHOP_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const WORKSHOP_FORMATS = ["ONLINE", "IN_PERSON", "HYBRID"] as const;
export const WORKSHOP_STATUSES = ["DRAFT", "OPEN", "RUNNING", "COMPLETED"] as const;
export const ENROLLMENT_STATUSES = ["ENROLLED", "WAITLIST", "COMPLETED", "DROPPED"] as const;

export const ETHICS_STATUSES = ["NOT_REQUIRED", "PENDING", "APPROVED"] as const;

/** Admin review of a newly posted project. Rejected projects auto-resubmit on edit. */
export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export const TASK_EFFORTS = ["S", "M", "L"] as const;

export const LICENSES = [
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "CC0-1.0",
  "MIT",
  "Apache-2.0",
  "All rights reserved",
] as const;

export const AVAILABILITY_OPTIONS = ["2–4 hours", "5–8 hours", "9+ hours"] as const;

/**
 * CRediT — the Contributor Roles Taxonomy used by most journals.
 * Recording these per member is what makes authorship on an open project
 * arguable instead of political.
 */
export const CREDIT_ROLES = [
  "Conceptualization",
  "Data curation",
  "Formal analysis",
  "Funding acquisition",
  "Investigation",
  "Methodology",
  "Project administration",
  "Resources",
  "Software",
  "Supervision",
  "Validation",
  "Visualization",
  "Writing – original draft",
  "Writing – review & editing",
] as const;
export type CreditRole = (typeof CREDIT_ROLES)[number];

export const RESEARCH_AREAS = [
  "Environmental data science",
  "Computational linguistics",
  "Public health",
  "Energy engineering",
  "Economics",
  "Agriculture",
  "Education",
  "Social science",
  "Computer science",
  "Medicine",
  "Marine biology",
  "Urban planning",
] as const;

export const LANGUAGES = ["Arabic", "French", "English", "Derja"] as const;
