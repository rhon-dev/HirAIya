"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  EntryDetailDialog,
  type MoodEntryDetail,
} from "@/components/entry-detail-dialog";
import { MOOD_EMOJI } from "@/lib/mood";

export function MoodChart({ entries }: { entries: MoodEntryDetail[] }) {
  const [selected, setSelected] = useState<MoodEntryDetail | null>(null);

  const data = entries.map((e) => ({
    ...e,
    label: new Date(e.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  }));

  return (
    <>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" fontSize={12} />
            <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} fontSize={12} />
            <Tooltip
              formatter={(value) => {
                if (typeof value === 'number') {
                  return [`${MOOD_EMOJI[value]} (${value}/5)`, "Mood"];
                }
                return ["", ""];
              }}
            />
            <Bar
              dataKey="mood"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(barData) => {
                const entry = entries.find((e) => e.id === barData.id);
                if (entry) setSelected(entry);
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill="var(--primary)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <EntryDetailDialog entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}
