"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteComment } from "@/app/comments/actions";
import { CommentForm } from "@/components/comment-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CommentNode = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
  replies: CommentNode[];
};

type CurrentUser = { id: string; role: "ADMIN" | "MEMBER" };

// Visual indent caps at this depth; deeper replies render flat underneath.
const MAX_INDENT_DEPTH = 4;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function CommentItem({
  comment,
  depth,
  feedbackId,
  currentUser,
}: {
  comment: CommentNode;
  depth: number;
  feedbackId: string;
  currentUser: CurrentUser;
}) {
  const [replying, setReplying] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canDelete =
    currentUser.role === "ADMIN" || currentUser.id === comment.author.id;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteComment(comment.id);
      if (result?.error) toast.error(result.error);
      else toast.success("Comment deleted");
    });
  }

  return (
    <div className={cn(depth > 0 && depth <= MAX_INDENT_DEPTH && "ml-6 border-l pl-4")}>
      <div className="space-y-1 py-2">
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">
              {initials(comment.author.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{comment.author.name}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setReplying((v) => !v)}
          >
            Reply
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="size-3" />
              Delete
            </Button>
          )}
        </div>
        {replying && (
          <div className="pt-1">
            <CommentForm
              feedbackId={feedbackId}
              parentId={comment.id}
              placeholder={`Reply to ${comment.author.name}…`}
              submitLabel="Reply"
              onDone={() => setReplying(false)}
              autoFocus
            />
          </div>
        )}
      </div>
      {comment.replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          feedbackId={feedbackId}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
}

export function CommentThread({
  comments,
  feedbackId,
  currentUser,
}: {
  comments: CommentNode[];
  feedbackId: string;
  currentUser: CurrentUser;
}) {
  if (comments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No comments yet. Start the discussion.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          depth={0}
          feedbackId={feedbackId}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
}
