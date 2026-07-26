import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avatarSrc } from "@/lib/format";
import { Shell } from "@/components/ui";
import { Composer } from "./Composer";
import { PostCard, type FeedPost } from "./PostCard";

export const metadata = { title: "Feed" };

const personSelect = {
  id: true,
  name: true,
  avatarColor: true,
  avatarUrl: true,
  avatarPath: true,
} as const;

export default async function FeedPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/feed");

  const [rawPosts, projects, workshops] = await Promise.all([
    db.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        author: { select: { ...personSelect, headline: true } },
        images: { select: { id: true }, orderBy: { order: "asc" } },
        linkedProject: { select: { slug: true, title: true, summary: true } },
        linkedWorkshop: { select: { slug: true, title: true } },
        reactions: { select: { kind: true, userId: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: personSelect } },
        },
      },
    }),
    db.project.findMany({
      where: { approvalStatus: "APPROVED", archived: false },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.workshop.findMany({
      select: { id: true, title: true },
      orderBy: { startDate: "desc" },
      take: 100,
    }),
  ]);

  const posts: FeedPost[] = rawPosts.map((p) => {
    const reactionCounts: Record<string, number> = {};
    let myReaction: string | null = null;
    for (const r of p.reactions) {
      reactionCounts[r.kind] = (reactionCounts[r.kind] ?? 0) + 1;
      if (r.userId === me.id) myReaction = r.kind;
    }
    return {
      id: p.id,
      body: p.body,
      createdAt: p.createdAt.toISOString(),
      author: {
        id: p.author.id,
        name: p.author.name,
        avatarColor: p.author.avatarColor,
        avatarSrc: avatarSrc(p.author),
        headline: p.author.headline,
      },
      images: p.images,
      linkedProject: p.linkedProject,
      linkedWorkshop: p.linkedWorkshop,
      reactionCounts,
      myReaction,
      comments: p.comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        author: {
          id: c.author.id,
          name: c.author.name,
          avatarColor: c.author.avatarColor,
          avatarSrc: avatarSrc(c.author),
        },
      })),
    };
  });

  const meProps = {
    id: me.id,
    name: me.name,
    avatarColor: me.avatarColor,
    avatarSrc: me.avatarSrc,
    role: me.role,
  };

  return (
    <Shell className="pb-24 pt-8">
      <div className="mx-auto max-w-[620px]">
        <div className="mb-6">
          <h1 className="font-serif text-[30px] font-medium">Community feed</h1>
          <p className="mt-1 text-[14px] text-ink-4">
            Share updates, questions, and wins with everyone on Open Research Tunisia.
          </p>
        </div>

        <Composer
          me={{ name: me.name, avatarColor: me.avatarColor, avatarSrc: me.avatarSrc }}
          projects={projects}
          workshops={workshops}
        />

        <div className="mt-6 flex flex-col gap-5">
          {posts.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-line-strong bg-card px-6 py-14 text-center">
              <div className="mb-2 text-[34px]">✍️</div>
              <h2 className="font-serif text-[19px] font-medium text-ink">No posts yet</h2>
              <p className="mx-auto mt-1 max-w-[360px] text-[13.5px] text-muted">
                Be the first to share something — a milestone, a question, or a paper worth reading.
              </p>
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} me={meProps} />)
          )}
        </div>
      </div>
    </Shell>
  );
}
