"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canModify } from "@/lib/auth";
import { feedbackSchema, type FeedbackInput } from "@/lib/validation";
import { Status } from "@/app/generated/prisma/enums";

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
  revalidatePath(`/feedback/${id}`);
}

export async function changeStatus(
  id: string,
  toStatus: Status
): Promise<ActionResult> {
  if (!Object.values(Status).includes(toStatus)) {
    return { error: "Invalid status" };
  }

  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    return { error: "Only admins can change status" };
  }

  // Update and audit log commit atomically: no status change without a
  // StatusChange record, and vice versa.
  try {
    await prisma.$transaction(async (tx) => {
      const feedback = await tx.feedback.findUnique({ where: { id } });
      if (!feedback) throw new Error("NOT_FOUND");
      if (feedback.status === toStatus) throw new Error("SAME_STATUS");

      await tx.feedback.update({ where: { id }, data: { status: toStatus } });
      await tx.statusChange.create({
        data: {
          feedbackId: id,
          fromStatus: feedback.status,
          toStatus,
          changedBy: user.id,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return { error: "Feedback not found" };
    }
    if (e instanceof Error && e.message === "SAME_STATUS") {
      return { error: "Feedback already has that status" };
    }
    throw e;
  }

  revalidatePath("/");
  revalidatePath(`/feedback/${id}`);
  revalidatePath("/roadmap");
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
