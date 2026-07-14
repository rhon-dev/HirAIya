import { z } from "zod";

export const feedbackSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be at most 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be at most 1000 characters"),
  category: z.enum(["UI", "UX", "FEATURE", "BUG", "ENHANCEMENT"], {
    message: "Category is required",
  }),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be at most 1000 characters"),
});

export type CommentInput = z.infer<typeof commentSchema>;
