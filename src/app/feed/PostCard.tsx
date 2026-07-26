import Link from "next/link";
import { Avatar } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { relativeTime } from "@/lib/format";
import { deleteCommentAction, deletePostAction } from "@/actions/feed";
import { ReactionBar } from "./ReactionBar";
import { CommentForm } from "./CommentForm";

type Person = { id: string; name: string; avatarColor: string; avatarSrc: string | null };
export type FeedComment = { id: string; body: string; createdAt: string; author: Person };
export type FeedPost = {
  id: string;
  body: string;
  createdAt: string;
  author: Person & { headline: string | null };
  images: { id: string }[];
  linkedProject: { slug: string; title: string; summary: string } | null;
  linkedWorkshop: { slug: string; title: string } | null;
  reactionCounts: Record<string, number>;
  myReaction: string | null;
  comments: FeedComment[];
};

export function PostCard({
  post,
  me,
}: {
  post: FeedPost;
  me: { id: string; name: string; avatarColor: string; avatarSrc: string | null; role: string };
}) {
  const isAdmin = me.role === "ADMIN";
  const canDeletePost = post.author.id === me.id || isAdmin;

  return (
    <article id={`post-${post.id}`} className="scroll-mt-24 rounded-[16px] border border-line bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4">
        <Link href={`/people/${post.author.id}`} className="shrink-0">
          <Avatar name={post.author.name} color={post.author.avatarColor} src={post.author.avatarSrc} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/people/${post.author.id}`}
            className="text-[14.5px] font-semibold text-ink no-underline hover:text-brick"
          >
            {post.author.name}
          </Link>
          {post.author.headline ? (
            <div className="truncate text-[12px] text-muted">{post.author.headline}</div>
          ) : null}
          <div className="text-[11.5px] text-muted">{relativeTime(post.createdAt)}</div>
        </div>
        {canDeletePost ? (
          <form action={deletePostAction}>
            <input type="hidden" name="postId" value={post.id} />
            <button
              type="submit"
              aria-label="Delete post"
              className="cursor-pointer rounded-full border-none bg-transparent px-2 py-1 text-[16px] leading-none text-muted hover:text-brick"
              title="Delete post"
            >
              ×
            </button>
          </form>
        ) : null}
      </div>

      {/* Body */}
      {post.body ? (
        <div className="prose-ort px-4 pt-3 text-[14.5px] leading-[1.6]">
          <Markdown>{post.body}</Markdown>
        </div>
      ) : null}

      {/* Images */}
      {post.images.length > 0 ? (
        <div className={`mt-3 ${post.images.length === 1 ? "" : "grid grid-cols-2 gap-1"} px-0`}>
          {post.images.map((img, i) => {
            const src = `/api/feed/images/${img.id}`;
            const spanFull = post.images.length > 1 && post.images.length % 2 === 1 && i === post.images.length - 1;
            return (
              <a key={img.id} href={src} target="_blank" rel="noopener noreferrer" className={spanFull ? "col-span-2" : ""}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className={
                    post.images.length === 1
                      ? "max-h-[540px] w-full object-cover"
                      : "aspect-video w-full object-cover"
                  }
                />
              </a>
            );
          })}
        </div>
      ) : null}

      {/* Linked project / workshop */}
      {post.linkedProject || post.linkedWorkshop ? (
        <div className="px-4 pt-3">
          {post.linkedProject ? (
            <Link
              href={`/projects/${post.linkedProject.slug}`}
              className="flex items-center gap-3 rounded-[12px] border border-line bg-sand/50 px-3.5 py-2.5 no-underline hover:border-brick hover:no-underline"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-brick-tint text-[15px]">🔬</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-brick">Project</span>
                <span className="block truncate text-[13.5px] font-semibold text-ink">{post.linkedProject.title}</span>
              </span>
            </Link>
          ) : null}
          {post.linkedWorkshop ? (
            <Link
              href={`/workshops/${post.linkedWorkshop.slug}`}
              className="flex items-center gap-3 rounded-[12px] border border-line bg-sand/50 px-3.5 py-2.5 no-underline hover:border-olive hover:no-underline"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-olive-tint text-[15px]">🎓</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-olive-dark">Workshop</span>
                <span className="block truncate text-[13.5px] font-semibold text-ink">{post.linkedWorkshop.title}</span>
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Reactions */}
      <div className="px-4 pb-1 pt-3">
        <ReactionBar
          postId={post.id}
          counts={post.reactionCounts}
          myReaction={post.myReaction}
          commentCount={post.comments.length}
        />
      </div>

      {/* Comments */}
      <div className="flex flex-col gap-2.5 border-t border-line-soft px-4 py-3">
        {post.comments.map((c) => {
          const canDeleteComment = c.author.id === me.id || post.author.id === me.id || isAdmin;
          return (
            <div key={c.id} className="group flex items-start gap-2">
              <Link href={`/people/${c.author.id}`} className="shrink-0">
                <Avatar name={c.author.name} color={c.author.avatarColor} src={c.author.avatarSrc} size={28} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="inline-block rounded-[14px] bg-sand/70 px-3 py-2">
                  <Link
                    href={`/people/${c.author.id}`}
                    className="text-[12.5px] font-semibold text-ink no-underline hover:text-brick"
                  >
                    {c.author.name}
                  </Link>
                  <div className="whitespace-pre-wrap break-words text-[13px] leading-[1.45] text-ink-2">{c.body}</div>
                </div>
                <div className="mt-0.5 flex items-center gap-2 pl-1 text-[11px] text-muted">
                  <span>{relativeTime(c.createdAt)}</span>
                  {canDeleteComment ? (
                    <form action={deleteCommentAction}>
                      <input type="hidden" name="commentId" value={c.id} />
                      <button
                        type="submit"
                        className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-muted opacity-0 transition-opacity hover:text-brick group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        <CommentForm postId={post.id} me={{ name: me.name, avatarColor: me.avatarColor, avatarSrc: me.avatarSrc }} />
      </div>
    </article>
  );
}
