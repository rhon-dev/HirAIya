"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MOOD_LABELS, MOOD_EMOJI } from "@/lib/mood";

export type MoodEntryDetail = {
  id: string;
  date: string; // ISO date string
  mood: number;
  sleepHours: number;
  feelings: string[];
  reflection: string | null;
};

export function EntryDetailDialog({
  entry,
  onClose,
}: {
  entry: MoodEntryDetail | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle>
                {new Date(entry.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                })}{" "}
                — {MOOD_EMOJI[entry.mood]} {MOOD_LABELS[entry.mood]}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">Slept {entry.sleepHours} hours</p>
              {entry.feelings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.feelings.map((f) => (
                    <Badge key={f} variant="secondary">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
              {entry.reflection && (
                <p className="text-sm text-muted-foreground">{entry.reflection}</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
