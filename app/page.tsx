import Link from "next/link";
import { ChevronUp, MessageSquare, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canModify } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge, StatusBadge } from "@/components/feedback-badges";
import { DeleteFeedbackButton } from "@/components/delete-feedback-button";

export default async function BoardPage() {
  const [feedbacks, currentUser] = await Promise.all([
    prisma.feedback.findMany({
      include: {
        author: { select: { name: true } },
        _count: { select: { votes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getCurrentUser(),
  ]);

  if (feedbacks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h2 className="text-lg font-semibold">No feedback yet</h2>
        <p className="text-sm text-muted-foreground">
          Be the first to suggest an improvement.
        </p>
        <Button asChild>
          <Link href="/feedback/new">New feedback</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedbacks.map((feedback) => (
        <Card key={feedback.id}>
          <CardContent className="flex items-start gap-4">
            <div className="flex flex-col items-center rounded-md border px-3 py-2">
              <ChevronUp className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {feedback._count.votes}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-snug">{feedback.title}</h3>
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
  );
}
