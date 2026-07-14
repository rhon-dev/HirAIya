"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { createComment } from "@/app/comments/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({
  feedbackId,
  parentId = null,
  placeholder = "Share your thoughts…",
  submitLabel = "Comment",
  onDone,
  autoFocus = false,
}: {
  feedbackId: string;
  parentId?: string | null;
  placeholder?: string;
  submitLabel?: string;
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = new FormData(e.currentTarget).get("content");
    startTransition(async () => {
      const result = await createComment(feedbackId, parentId, {
        content: typeof content === "string" ? content : "",
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        formRef.current?.reset();
        onDone?.();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        name="content"
        rows={3}
        placeholder={placeholder}
        maxLength={1000}
        autoFocus={autoFocus}
        required
      />
      <div className="flex justify-end gap-2">
        {onDone && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDone}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Posting…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
