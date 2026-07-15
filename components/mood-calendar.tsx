"use client";

import { useState } from "react";
import {
  EntryDetailDialog,
  type MoodEntryDetail,
} from "@/components/entry-detail-dialog";
import { MOOD_EMOJI } from "@/lib/mood";

export function MoodCalendar({ entries }: { entries: MoodEntryDetail[] }) {
  const [selected, setSelected] = useState<MoodEntryDetail | null>(null);

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();

  const entryByDay = new Map<number, MoodEntryDetail>();
  for (const entry of entries) {
    const d = new Date(entry.date);
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month) {
      entryByDay.set(d.getUTCDate(), entry);
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const entry = day ? entryByDay.get(day) : undefined;
          return (
            <button
              key={i}
              type="button"
              disabled={!day || !entry}
              onClick={() => entry && setSelected(entry)}
              className={`aspect-square rounded-md border text-sm ${
                day ? "border-border" : "border-transparent"
              } ${entry ? "cursor-pointer hover:bg-muted" : "cursor-default"}`}
            >
              {day && (
                <div className="flex h-full flex-col items-center justify-center gap-0.5">
                  <span className="text-xs text-muted-foreground">{day}</span>
                  {entry && <span>{MOOD_EMOJI[entry.mood]}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <EntryDetailDialog entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}
