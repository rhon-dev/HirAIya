import Link from "next/link";
import { MessageSquare, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canModify } from "@/lib/auth";
import type { Prisma, Category, Status } from "@/app/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge, StatusBadge, CATEGORY_LABELS, STATUS_LABELS } from "@/components/feedback-badges";
import { DeleteFeedbackButton } from "@/components/delete-feedback-button";
import { VoteButton } from "@/components/vote-button";
import { BoardControls, type SortKey } from "@/components/board-controls";

const SORT_ORDERS: Record<SortKey, Prisma.FeedbackOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  most_votes: { votes: { _count: "desc" } },
  least_votes: { votes: { _count: "asc" } },
  most_comments: { comments: { _count: "desc" } },
  least_comments: { comments: { _count: "asc" } },
};

function parseSort(value: string | undefined): SortKey {
  return value && value in SORT_ORDERS ? (value as SortKey) : "newest";
}

function parseEnum<T extends string>(
  value: string | undefined,
  valid: Record<T, string>
): T | undefined {
  return value && value in valid ? (value as T) : undefined;
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; category?: string; status?: string }>;
}) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const category = parseEnum<Category>(params.category, CATEGORY_LABELS);
  const status = parseEnum<Status>(params.status, STATUS_LABELS);

  const currentUser = await getCurrentUser();
  const feedbacks = await prisma.feedback.findMany({
    where: {
      ...(category && { category }),
      ...(status && { status }),
    },
    include: {
      author: { select: { name: true } },
      votes: { where: { userId: currentUser.id }, select: { id: true } },
      _count: { select: { votes: true, comments: true } },
    },
    orderBy: SORT_ORDERS[sort],
  });

  return (
    <div className="space-y-4">
      <BoardControls />

      {feedbacks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <h2 className="text-lg font-semibold">No feedback found</h2>
          <p className="text-sm text-muted-foreground">
            Try different filters, or be the first to suggest an improvement.
          </p>
          <Button asChild>
            <Link href="/feedback/new">New feedback</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((feedback) => (
            <Card key={feedback.id}>
              <CardContent className="flex items-start gap-4">
                <VoteButton
                  feedbackId={feedback.id}
                  count={feedback._count.votes}
                  hasVoted={feedback.votes.length > 0}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug">
                      <Link
                        href={`/feedback/${feedback.id}`}
                        className="hover:underline"
                      >
                        {feedback.title}
                      </Link>
                    </h3>
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
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {feedback.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={feedback.category} />
                    <StatusBadge status={feedback.status} />
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="size-3.5" />
                      {feedback._count.comments}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {feedback.author.name}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
