"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canModify } from "@/lib/auth";
import { feedbackSchema, type FeedbackInput } from "@/lib/validation";

export type ActionResult = { error: string } | undefined;

export async function createFeedback(input: FeedbackInput): Promise<ActionResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  await prisma.feedback.create({
    data: { ...parsed.data, authorId: user.id },
  });

  revalidatePath("/");
  redirect("/");
}

export async function updateFeedback(
  id: string,
  input: FeedbackInput
): Promise<ActionResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (!feedback) return { error: "Feedback not found" };
  if (!canModify(user, feedback)) {
    return { error: "You can only edit your own feedback" };
  }

  await prisma.feedback.update({ where: { id }, data: parsed.data });

  revalidatePath("/");
  redirect("/");
}

export async function deleteFeedback(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (!feedback) return { error: "Feedback not found" };
  if (!canModify(user, feedback)) {
    return { error: "You can only delete your own feedback" };
  }

  await prisma.feedback.delete({ where: { id } });
  revalidatePath("/");
}
