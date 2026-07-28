import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc } from "@/lib/format";
import { loadReactions } from "@/lib/reactionData";
import { EmptyState } from "@/components/ui";
import { MessageComposer } from "./MessageComposer";
import { MessageThread, type DiscussionMessage } from "./MessageThread";

/** The shared discussion: threaded messages with reactions, replies and
 *  @mentions, for a project OR a workshop (pass exactly one id). */
export async function DiscussionPanel({
  projectId,
  workshopId,
  composerPlaceholder,
  emptyHint,
}: {
  projectId?: string;
  workshopId?: string;
  composerPlaceholder?: string;
  emptyHint?: string;
}) {
  const me = await getCurrentUser();
  const where = projectId ? { projectId } : { workshopId };

  const messages = await db.message.findMany({
    where,
    include: { author: { select: { id: true, name: true, avatarColor: true, avatarUrl: true, avatarPath: true } } },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  const reactions = await loadReactions(
    "message",
    messages.map((m) => m.id),
    me?.id ?? "",
  );

  const toMsg = (m: (typeof messages)[number]): DiscussionMessage => {
    const summary = reactions.get(m.id);
    return {
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      author: {
        id: m.author.id,
        name: m.author.name,
        avatarColor: m.author.avatarColor,
        avatarSrc: avatarSrc(m.author),
      },
      reactionCounts: summary?.counts ?? {},
      myReaction: summary?.myReaction ?? null,
      replies: [],
    };
  };

  const repliesByParent = new Map<string, (typeof messages)[number][]>();
  for (const m of messages) {
    if (m.parentId) {
      const list = repliesByParent.get(m.parentId) ?? [];
      list.push(m);
      repliesByParent.set(m.parentId, list);
    }
  }
  const threads = messages
    .filter((m) => !m.parentId)
    .map((m) => ({ ...toMsg(m), replies: (repliesByParent.get(m.id) ?? []).map(toMsg) }));

  const target = projectId ? { projectId } : { workshopId };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        {threads.length === 0 ? (
          <EmptyState title="No messages yet." hint={emptyHint ?? "Be the first to say something."} />
        ) : (
          threads.map((m) => <MessageThread key={m.id} message={m} {...target} />)
        )}
      </div>

      <div className="border-t border-line pt-4">
        <MessageComposer {...target} placeholder={composerPlaceholder} />
      </div>
    </div>
  );
}
