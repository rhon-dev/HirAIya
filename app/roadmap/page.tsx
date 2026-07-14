import Link from "next/link";
import { ChevronUp, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge, STATUS_LABELS } from "@/components/feedback-badges";
import { Status } from "@/app/generated/prisma/enums";
import { cn } from "@/lib/utils";

const COLUMN_ACCENTS: Record<Status, string> = {
  SUGGESTION: "border-t-gray-400",
  PLANNED: "border-t-sky-500",
  IN_PROGRESS: "border-t-amber-500",
  LIVE: "border-t-green-500",
};

export default async function RoadmapPage() {
  const feedbacks = await prisma.feedback.findMany({
    include: {
      _count: { select: { votes: true, comments: true } },
    },
    orderBy: { votes: { _count: "desc" } },
  });

  const columns = Object.values(Status).map((status) => ({
    status,
    items: feedbacks.filter((f) => f.status === status),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Roadmap</h1>
        <p className="text-sm text-muted-foreground">
          Where every request stands, sorted by votes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map(({ status, items }) => (
          <div
            key={status}
            className={cn(
              "space-y-3 rounded-lg border border-t-4 bg-muted/30 p-3",
              COLUMN_ACCENTS[status],
            )}
          >
            <h2 className="flex items-center justify-between text-sm font-semibold">
              {STATUS_LABELS[status]}
              <span className="text-xs font-normal text-muted-foreground">
                {items.length}
              </span>
            </h2>
            {items.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nothing here yet
              </p>
            ) : (
              items.map((feedback) => (
                <Card key={feedback.id} className="py-3">
                  <CardContent className="space-y-2 px-3">
                    <Link
                      href={`/feedback/${feedback.id}`}
                      className="block text-sm font-medium leading-snug hover:underline"
                    >
                      {feedback.title}
                    </Link>
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={feedback.category} />
                      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <ChevronUp className="size-3" />
                        {feedback._count.votes}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="size-3" />
                        {feedback._count.comments}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
