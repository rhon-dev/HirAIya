"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@/app/generated/prisma/client";

export type VoteResult = { error: string } | undefined;

// Concurrency-safe voting: the existence check and insert run inside one
// transaction, and the @@unique([userId, feedbackId]) constraint is the
// DB-level backstop if two requests race past the check simultaneously.
export async function voteFeedback(feedbackId: string): Promise<VoteResult> {
  const user = await getCurrentUser();

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.vote.findUnique({
        where: { userId_feedbackId: { userId: user.id, feedbackId } },
      });
      if (existing) throw new Error("ALREADY_VOTED");

      await tx.vote.create({
        data: { userId: user.id, feedbackId },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_VOTED") {
      return { error: "You already voted for this" };
    }
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { error: "You already voted for this" };
    }
    throw e;
  }

  revalidatePath("/");
}

export async function unvoteFeedback(feedbackId: string): Promise<VoteResult> {
  const user = await getCurrentUser();

  const deleted = await prisma.vote.deleteMany({
    where: { userId: user.id, feedbackId },
  });
  if (deleted.count === 0) {
    return { error: "You haven't voted for this" };
  }

  revalidatePath("/");
}
