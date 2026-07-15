"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { saveMoodEntry } from "@/app/actions";
import { moodEntrySchema, type MoodEntryInput } from "@/lib/validation";
import { MOOD_LEVELS } from "@/lib/mood";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const FEELINGS_OPTIONS = [
  "Anxious", "Grateful", "Tired", "Motivated", "Content",
  "Stressed", "Relaxed", "Hopeful", "Overwhelmed", "Proud",
];

export function MoodEntryForm({
  defaultValues,
  onSaved,
}: {
  defaultValues?: Partial<MoodEntryInput>;
  onSaved?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>(
    defaultValues?.feelings ?? []
  );
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MoodEntryInput>({
    resolver: zodResolver(moodEntrySchema),
    defaultValues: {
      mood: defaultValues?.mood ?? 0,
      sleepHours: defaultValues?.sleepHours ?? 8,
      feelings: defaultValues?.feelings ?? [],
      reflection: defaultValues?.reflection ?? "",
    },
  });

  const currentMood = watch("mood");

  function toggleFeeling(feeling: string) {
    const next = selectedFeelings.includes(feeling)
      ? selectedFeelings.filter((f) => f !== feeling)
      : [...selectedFeelings, feeling];
    setSelectedFeelings(next);
    setValue("feelings", next);
  }

  function onSubmit(input: MoodEntryInput) {
    startTransition(async () => {
      const result = await saveMoodEntry(input);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Entry saved");
        onSaved?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">How are you feeling?</label>
        <div className="flex gap-2">
          {MOOD_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setValue("mood", level.value)}
              className={`flex-1 rounded-md border p-3 text-2xl transition ${
                currentMood === level.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              }`}
              aria-label={level.label}
            >
              {level.emoji}
            </button>
          ))}
        </div>
        {errors.mood && (
          <p className="text-sm text-destructive">{errors.mood.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="sleepHours" className="text-sm font-medium">
          Hours of sleep
        </label>
        <Input
          id="sleepHours"
          type="number"
          step="0.5"
          min="0"
          max="24"
          {...register("sleepHours", { valueAsNumber: true })}
        />
        {errors.sleepHours && (
          <p className="text-sm text-destructive">{errors.sleepHours.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Feelings</label>
        <div className="flex flex-wrap gap-2">
          {FEELINGS_OPTIONS.map((feeling) => (
            <button
              key={feeling}
              type="button"
              onClick={() => toggleFeeling(feeling)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                selectedFeelings.includes(feeling)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              }`}
            >
              {feeling}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="reflection" className="text-sm font-medium">
          Reflection (optional)
        </label>
        <Textarea
          id="reflection"
          rows={4}
          placeholder="Anything on your mind?"
          {...register("reflection")}
        />
        {errors.reflection && (
          <p className="text-sm text-destructive">{errors.reflection.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save entry"}
      </Button>
    </form>
  );
}
