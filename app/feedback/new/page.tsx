import { createFeedback } from "@/app/feedback/actions";
import { FeedbackForm } from "@/components/feedback-form";

export default function NewFeedbackPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New feedback</h1>
        <p className="text-sm text-muted-foreground">
          Suggest a feature, report a bug, or propose an improvement.
        </p>
      </div>
      <FeedbackForm action={createFeedback} submitLabel="Submit feedback" />
    </div>
  );
}
