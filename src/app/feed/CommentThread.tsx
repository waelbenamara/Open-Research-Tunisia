"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import { MentionText } from "@/components/MentionText";
import { Reactions } from "@/components/Reactions";
import { relativeTime } from "@/lib/format";
import { deleteCommentAction } from "@/actions/feed";
import { CommentForm } from "./CommentForm";
import type { FeedComment } from "./PostCard";

type Me = { id: string; name: string; avatarColor: string; avatarSrc: string | null };

function CommentBody({
  c,
  meId,
  postAuthorId,
  isAdmin,
  onReply,
}: {
  c: FeedComment;
  meId: string;
  postAuthorId: string;
  isAdmin: boolean;
  onReply?: () => void;
}) {
  const canDelete = c.author.id === meId || postAuthorId === meId || isAdmin;
  return (
    <div className="min-w-0 flex-1">
      <div className="inline-block max-w-full rounded-[14px] bg-sand/70 px-3 py-2">
        <Link
          href={`/people/${c.author.id}`}
          className="text-[12.5px] font-semibold text-ink no-underline hover:text-brick"
        >
          {c.author.name}
        </Link>
        <MentionText className="text-[13px] leading-[1.45] text-ink-2">{c.body}</MentionText>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-[11px] text-muted">
        <span>{relativeTime(c.createdAt)}</span>
        <Reactions
          targetType="post_comment"
          targetId={c.id}
          counts={c.reactionCounts}
          myReaction={c.myReaction}
        />
        {onReply ? (
          <button
            type="button"
            onClick={onReply}
            className="cursor-pointer border-none bg-transparent p-0 text-[11.5px] font-semibold text-muted hover:text-brick"
          >
            Reply
          </button>
        ) : null}
        {canDelete ? (
          <form action={deleteCommentAction}>
            <input type="hidden" name="commentId" value={c.id} />
            <button
              type="submit"
              className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-muted hover:text-brick"
            >
              Delete
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export function CommentThread({
  comment,
  postId,
  postAuthorId,
  me,
  isAdmin,
}: {
  comment: FeedComment;
  postId: string;
  postAuthorId: string;
  me: Me;
  isAdmin: boolean;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Link href={`/people/${comment.author.id}`} className="shrink-0">
          <Avatar name={comment.author.name} color={comment.author.avatarColor} src={comment.author.avatarSrc} size={28} />
        </Link>
        <CommentBody
          c={comment}
          meId={me.id}
          postAuthorId={postAuthorId}
          isAdmin={isAdmin}
          onReply={() => setReplying((v) => !v)}
        />
      </div>

      {comment.replies && comment.replies.length > 0 ? (
        <div className="ml-9 flex flex-col gap-2">
          {comment.replies.map((r) => (
            <div key={r.id} className="flex items-start gap-2">
              <Link href={`/people/${r.author.id}`} className="shrink-0">
                <Avatar name={r.author.name} color={r.author.avatarColor} src={r.author.avatarSrc} size={24} />
              </Link>
              <CommentBody c={r} meId={me.id} postAuthorId={postAuthorId} isAdmin={isAdmin} />
            </div>
          ))}
        </div>
      ) : null}

      {replying ? (
        <div className="ml-9">
          <CommentForm
            postId={postId}
            me={me}
            parentId={comment.id}
            autoFocus
            placeholder="Write a reply…  @ to mention"
            onDone={() => setReplying(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
