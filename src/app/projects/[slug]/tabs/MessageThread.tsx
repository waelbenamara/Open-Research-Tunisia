"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import { MentionText } from "@/components/MentionText";
import { Reactions } from "@/components/Reactions";
import { relativeTime } from "@/lib/format";
import { MessageComposer } from "./MessageComposer";

export type DiscussionMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; avatarColor: string; avatarSrc: string | null };
  reactionCounts: Record<string, number>;
  myReaction: string | null;
  replies?: DiscussionMessage[];
};

function Bubble({ m, size }: { m: DiscussionMessage; size: number }) {
  return (
    <div className="flex gap-3">
      <Link href={`/people/${m.author.id}`} className="shrink-0">
        <Avatar name={m.author.name} color={m.author.avatarColor} src={m.author.avatarSrc} size={size} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-[12px] border border-line bg-card px-4 py-3">
          <div className="mb-1 flex items-baseline gap-2.5">
            <Link
              href={`/people/${m.author.id}`}
              className="text-[13.5px] font-semibold text-ink no-underline hover:text-brick"
            >
              {m.author.name}
            </Link>
            <span className="text-[12px] text-muted">{relativeTime(m.createdAt)}</span>
          </div>
          <MentionText className="text-[14px] leading-[1.55] text-ink-2">{m.body}</MentionText>
        </div>
      </div>
    </div>
  );
}

export function MessageThread({
  message,
  projectId,
}: {
  message: DiscussionMessage;
  projectId: string;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Bubble m={message} size={34} />
      <div className="ml-[46px] flex items-center gap-4 text-[11.5px] text-muted">
        <Reactions
          targetType="message"
          targetId={message.id}
          counts={message.reactionCounts}
          myReaction={message.myReaction}
        />
        <button
          type="button"
          onClick={() => setReplying((v) => !v)}
          className="cursor-pointer border-none bg-transparent p-0 text-[11.5px] font-semibold text-muted hover:text-brick"
        >
          Reply
        </button>
      </div>

      {message.replies && message.replies.length > 0 ? (
        <div className="ml-[46px] flex flex-col gap-2 border-l border-line-soft pl-3">
          {message.replies.map((r) => (
            <div key={r.id} className="flex flex-col gap-1">
              <Bubble m={r} size={28} />
              <div className="ml-[40px]">
                <Reactions
                  targetType="message"
                  targetId={r.id}
                  counts={r.reactionCounts}
                  myReaction={r.myReaction}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {replying ? (
        <div className="ml-[46px]">
          <MessageComposer
            projectId={projectId}
            parentId={message.id}
            autoFocus
            placeholder="Write a reply…  @ to mention"
            onDone={() => setReplying(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
