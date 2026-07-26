export const REACTIONS = [
  { kind: "like", emoji: "👍", label: "Like" },
  { kind: "celebrate", emoji: "🎉", label: "Celebrate" },
  { kind: "love", emoji: "❤️", label: "Love" },
  { kind: "insightful", emoji: "💡", label: "Insightful" },
  { kind: "clap", emoji: "👏", label: "Clap" },
] as const;

export type ReactionKind = (typeof REACTIONS)[number]["kind"];

export const REACTION_KINDS: string[] = REACTIONS.map((r) => r.kind);

export const REACTION_EMOJI: Record<string, string> = Object.fromEntries(
  REACTIONS.map((r) => [r.kind, r.emoji]),
);

export const REACTION_LABEL: Record<string, string> = Object.fromEntries(
  REACTIONS.map((r) => [r.kind, r.label]),
);
