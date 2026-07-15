"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { moodEntrySchema, profileSchema, type MoodEntryInput, type ProfileInput } from "@/lib/validation";
import { todayUTC } from "@/lib/mood";

export type ActionResult = { error: string } | undefined;

export async function saveMoodEntry(input: MoodEntryInput): Promise<ActionResult> {
  const parsed = moodEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  const date = todayUTC();

  await prisma.moodEntry.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: {
      userId: user.id,
      date,
      mood: parsed.data.mood,
      sleepHours: parsed.data.sleepHours,
      feelings: parsed.data.feelings,
      reflection: parsed.data.reflection || null,
    },
    update: {
      mood: parsed.data.mood,
      sleepHours: parsed.data.sleepHours,
      feelings: parsed.data.feelings,
      reflection: parsed.data.reflection || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      avatar: parsed.data.avatar || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
}
