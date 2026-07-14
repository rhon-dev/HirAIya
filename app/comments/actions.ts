"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canModify } from "@/lib/auth";
import { commentSchema } from "@/lib/validation";

export type CommentResult = { error: string } | undefined;

export async function createComment(
  feedbackId: string,
  parentId: string | null,
  input: { content: string }
): Promise<CommentResult> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid comment" };
  }

  const user = await getCurrentUser();

  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });
  if (!feedback) return { error: "Feedback not found" };

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { feedbackId: true },
    });
    if (!parent || parent.feedbackId !== feedbackId) {
      return { error: "Parent comment not found" };
    }
  }

  await prisma.comment.create({
    data: {
      content: parsed.data.content,
      authorId: user.id,
      feedbackId,
      parentId,
    },
  });

  revalidatePath(`/feedback/${feedbackId}`);
  revalidatePath("/");
}

export async function deleteComment(commentId: string): Promise<CommentResult> {
  const user = await getCurrentUser();

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return { error: "Comment not found" };
  if (!canModify(user, comment)) {
    return { error: "You can only delete your own comments" };
  }

  // Adjacency list: collect the whole reply subtree so deleting a comment
  // doesn't orphan its replies to the top level (parentId would SetNull).
  const all = await prisma.comment.findMany({
    where: { feedbackId: comment.feedbackId },
    select: { id: true, parentId: true },
  });
  const childrenOf = new Map<string | null, string[]>();
  for (const c of all) {
    const list = childrenOf.get(c.parentId) ?? [];
    list.push(c.id);
    childrenOf.set(c.parentId, list);
  }
  const toDelete: string[] = [];
  const queue = [commentId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    toDelete.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }

  await prisma.comment.deleteMany({ where: { id: { in: toDelete } } });

  revalidatePath(`/feedback/${comment.feedbackId}`);
  revalidatePath("/");
}
