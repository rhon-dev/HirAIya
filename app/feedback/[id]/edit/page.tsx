import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canModify } from "@/lib/auth";
import { updateFeedback } from "@/app/feedback/actions";
import { FeedbackForm } from "@/components/feedback-form";

export default async function EditFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [feedback, currentUser] = await Promise.all([
    prisma.feedback.findUnique({ where: { id } }),
    getCurrentUser(),
  ]);

  if (!feedback) notFound();
  if (!canModify(currentUser, feedback)) redirect("/");

  const updateAction = updateFeedback.bind(null, feedback.id);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit feedback</h1>
        <p className="text-sm text-muted-foreground">
          Update the title, description, or category.
        </p>
      </div>
      <FeedbackForm
        action={updateAction}
        defaultValues={{
          title: feedback.title,
          description: feedback.description,
          category: feedback.category,
        }}
        submitLabel="Save changes"
      />
    </div>
  );
}
