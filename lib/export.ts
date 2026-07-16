import { MOOD_LABELS } from "@/lib/mood";
import type { MoodEntry } from "@/app/generated/prisma/client";

export type ExportRow = {
  date: string; // YYYY-MM-DD (entries are stored at midnight UTC)
  mood: number;
  moodLabel: string;
  sleepHours: number;
  feelings: string[];
  reflection: string | null;
};

export function toExportRow(entry: MoodEntry): ExportRow {
  return {
    date: entry.date.toISOString().slice(0, 10),
    mood: entry.mood,
    moodLabel: MOOD_LABELS[entry.mood] ?? String(entry.mood),
    sleepHours: entry.sleepHours,
    feelings: entry.feelings,
    reflection: entry.reflection,
  };
}

// RFC 4180: every field is quoted unconditionally; internal quotes are doubled.
// Unconditional quoting is always valid CSV and avoids a "does this field need
// quoting" branch that's easy to get subtly wrong (newlines, quotes, commas).
export function csvEscape(field: string): string {
  return `"${field.replace(/"/g, '""')}"`;
}

const CSV_HEADER = ["date", "mood", "moodLabel", "sleepHours", "feelings", "reflection"];

export function entriesToCsv(entries: MoodEntry[]): string {
  const lines = [CSV_HEADER.map(csvEscape).join(",")];
  for (const entry of entries) {
    const row = toExportRow(entry);
    lines.push(
      [
        row.date,
        String(row.mood),
        row.moodLabel,
        String(row.sleepHours),
        row.feelings.join(";"),
        row.reflection ?? "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\r\n") + "\r\n";
}
