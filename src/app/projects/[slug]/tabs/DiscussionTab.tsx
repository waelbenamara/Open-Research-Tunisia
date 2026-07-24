import { db } from "@/lib/db";
import { avatarSrc, relativeTime } from "@/lib/format";
import { postMessageAction } from "@/actions/projects";
import { Avatar, EmptyState } from "@/components/ui";
import type { ProjectAccess } from "@/lib/permissions";

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

  const messages = await db.message.findMany({
    where: { projectId },
    include: { author: { select: { id: true, name: true, avatarColor: true, avatarUrl: true, avatarPath: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3.5">
        {messages.length === 0 ? (
          <EmptyState title="No messages yet." hint="Be the first to say something." />
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex gap-3.5">
              <Avatar name={m.author.name} color={m.author.avatarColor} src={avatarSrc(m.author)} size={34} />
              <div className="flex-1 border border-line bg-card px-4 py-3">
                <div className="mb-1 flex items-baseline gap-2.5">
                  <span className="text-[13.5px] font-semibold">{m.author.name}</span>
                  <span className="text-[12px] text-muted">{relativeTime(m.createdAt)}</span>
                </div>
                <div className="whitespace-pre-line text-[14px] leading-[1.55] text-ink-2">
                  {m.body}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form action={postMessageAction} className="flex gap-2.5">
        <input type="hidden" name="projectId" value={projectId} />
        <input name="body" placeholder="Write a message to the project…" required className="flex-1" />
        <button
          type="submit"
          className="cursor-pointer whitespace-nowrap border-none bg-brick px-[22px] py-2.5 text-[13.5px] font-semibold hover:bg-brick-dark"
          style={{ color: "#faf8f3" }}
        >
          Post
        </button>
      </form>
    </div>
  );
}
