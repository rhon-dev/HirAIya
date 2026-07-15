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
  feelings: z.array(z.string()).default([]),
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
