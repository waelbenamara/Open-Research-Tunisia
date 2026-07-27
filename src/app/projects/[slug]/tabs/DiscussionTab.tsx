import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc } from "@/lib/format";
import { loadReactions } from "@/lib/reactionData";
import { EmptyState } from "@/components/ui";
import type { ProjectAccess } from "@/lib/permissions";
import { MessageComposer } from "./MessageComposer";
import { MessageThread, type DiscussionMessage } from "./MessageThread";

export async function DiscussionTab({
  projectId,
  access,
}: {
  projectId: string;
  access: ProjectAccess;
  slug: string;
}) {
  if (!access.canSeeInternal) {
    return (
      <EmptyState
        title="The discussion is for project members."
        hint="Apply to contribute to join the conversation."
      />
    );
  }

  const me = await getCurrentUser();
  const messages = await db.message.findMany({
    where: { projectId },
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

  // Thread one level deep.
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        {threads.length === 0 ? (
          <EmptyState title="No messages yet." hint="Be the first to say something." />
        ) : (
          threads.map((m) => <MessageThread key={m.id} message={m} projectId={projectId} />)
        )}
      </div>

      <div className="border-t border-line pt-4">
        <MessageComposer projectId={projectId} placeholder="Write a message to the project…  @ to mention" />
      </div>
    </div>
  );
}
