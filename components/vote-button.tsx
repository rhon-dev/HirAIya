"use client";

import { useOptimistic, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { voteFeedback, unvoteFeedback } from "@/app/votes/actions";
import { cn } from "@/lib/utils";

type VoteState = { count: number; hasVoted: boolean };

export function VoteButton({
  feedbackId,
  count,
  hasVoted,
}: {
  feedbackId: string;
  count: number;
  hasVoted: boolean;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<VoteState, "vote" | "unvote">(
    { count, hasVoted },
    (state, action) =>
      action === "vote"
        ? { count: state.count + 1, hasVoted: true }
        : { count: state.count - 1, hasVoted: false },
  );

  function handleClick() {
    startTransition(async () => {
      if (optimistic.hasVoted) {
        setOptimistic("unvote");
        const result = await unvoteFeedback(feedbackId);
        if (result?.error) toast.error(result.error);
      } else {
        setOptimistic("vote");
        const result = await voteFeedback(feedbackId);
        if (result?.error) toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={optimistic.hasVoted}
      className={cn(
        "flex cursor-pointer flex-col items-center rounded-md border px-3 py-2 transition-colors",
        optimistic.hasVoted
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-accent",
      )}
    >
      <ChevronUp
        className={cn(
          "size-4",
          optimistic.hasVoted ? "" : "text-muted-foreground",
        )}
      />
      <span className="text-sm font-semibold">{optimistic.count}</span>
      <span className="sr-only">
        {optimistic.hasVoted ? "Remove vote" : "Vote"}
      </span>
    </button>
  );
}
