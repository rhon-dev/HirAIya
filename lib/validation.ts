import { z } from "zod";

export const moodEntrySchema = z.object({
  mood: z
    .number()
    .int()
    .min(1, "Mood is required")
    .max(5, "Mood is required"),
  sleepHours: z
    .number()
    .min(0, "Sleep hours must be between 0 and 24")
    .max(24, "Sleep hours must be between 0 and 24"),
  feelings: z.array(z.string()),
  reflection: z
    .string()
    .max(2000, "Reflection must be at most 2000 characters")
    .optional()
    .or(z.literal("")),
});

export type MoodEntryInput = z.infer<typeof moodEntrySchema>;

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  avatar: z
    .string()
    .trim()
    .url("Avatar must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const reminderSettingsSchema = z.object({
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM (24-hour)"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  subscription: z.object({
    endpoint: z.string().url("Invalid subscription endpoint"),
    keys: z.object({
      p256dh: z.string().min(1, "Missing subscription key"),
      auth: z.string().min(1, "Missing subscription key"),
    }),
  }),
});

export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;

export const disableReminderSchema = z.object({
  endpoint: z.string().url("Invalid subscription endpoint"),
});

export type DisableReminderInput = z.infer<typeof disableReminderSchema>;
