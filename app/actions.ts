"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { moodEntrySchema, profileSchema, reminderSettingsSchema, disableReminderSchema, type MoodEntryInput, type ProfileInput, type ReminderSettingsInput, type DisableReminderInput } from "@/lib/validation";
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

export async function saveReminderSettings(
  input: ReminderSettingsInput
): Promise<ActionResult> {
  const parsed = reminderSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  const { time, timezone, subscription } = parsed.data;

  await prisma.$transaction([
    prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { reminderEnabled: true, reminderTime: time, timezone },
    }),
  ]);

  revalidatePath("/settings");
}

export async function disableReminder(
  input: DisableReminderInput
): Promise<ActionResult> {
  const parsed = disableReminderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  await prisma.$transaction([
    prisma.pushSubscription.deleteMany({
      where: { endpoint: parsed.data.endpoint },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { reminderEnabled: false },
    }),
  ]);

  revalidatePath("/settings");
}
