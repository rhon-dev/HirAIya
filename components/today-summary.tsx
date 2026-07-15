"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoodEntryForm } from "@/components/mood-entry-form";
import { MOOD_LABELS, MOOD_EMOJI } from "@/lib/mood";
import { getQuoteForEntry } from "@/lib/quotes";

type EntryProps = {
  id: string;
  mood: number;
  sleepHours: number;
  feelings: string[];
  reflection: string | null;
};

export function TodaySummary({ entry }: { entry: EntryProps }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <MoodEntryForm
        defaultValues={{
          mood: entry.mood,
          sleepHours: entry.sleepHours,
          feelings: entry.feelings,
          reflection: entry.reflection ?? "",
        }}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {MOOD_EMOJI[entry.mood]} {MOOD_LABELS[entry.mood]}
          </span>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm italic text-muted-foreground">
          "{getQuoteForEntry(entry.id, entry.mood)}"
        </p>
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
      </CardContent>
    </Card>
  );
}
