import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canModify } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge, StatusBadge } from "@/components/feedback-badges";
import { DeleteFeedbackButton } from "@/components/delete-feedback-button";
import { VoteButton } from "@/components/vote-button";
import { CommentForm } from "@/components/comment-form";
import { CommentThread, type CommentNode } from "@/components/comment-thread";
import { StatusSelect } from "@/components/status-select";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      votes: { where: { userId: currentUser.id }, select: { id: true } },
      _count: { select: { votes: true, comments: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!feedback) notFound();

  // Build the reply tree from the adjacency list (parentId self-relation).
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const comment of feedback.comments) {
    nodes.set(comment.id, {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
      replies: [],
    });
  }
  for (const comment of feedback.comments) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/">← Back to board</Link>
      </Button>

      <Card>
        <CardContent className="flex items-start gap-4">
          <VoteButton
            feedbackId={feedback.id}
            count={feedback._count.votes}
            hasVoted={feedback.votes.length > 0}
          />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-lg font-semibold leading-snug">
                {feedback.title}
              </h1>
              {canModify(currentUser, feedback) && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link href={`/feedback/${feedback.id}/edit`}>
                      <Pencil />
                      <span className="sr-only">Edit</span>
                    </Link>
                  </Button>
                  <DeleteFeedbackButton
                    feedbackId={feedback.id}
                    feedbackTitle={feedback.title}
                  />
                </div>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {feedback.description}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={feedback.category} />
              {currentUser.role === "ADMIN" ? (
                <StatusSelect feedbackId={feedback.id} status={feedback.status} />
              ) : (
                <StatusBadge status={feedback.status} />
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {feedback.author.name} ·{" "}
                {feedback.createdAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-semibold">
          Comments ({feedback._count.comments})
        </h2>
        <CommentForm feedbackId={feedback.id} />
        <CommentThread
          comments={roots}
          feedbackId={feedback.id}
          currentUser={{ id: currentUser.id, role: currentUser.role }}
        />
      </section>
    </div>
  );
}
