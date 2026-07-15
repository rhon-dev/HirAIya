import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MoodChart } from "@/components/mood-chart";
import { MoodCalendar } from "@/components/mood-calendar";
import { MoodComparisonCard } from "@/components/mood-comparison-card";
import type { MoodEntryDetail } from "@/components/entry-detail-dialog";

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export default async function HistoryPage() {
  const user = await getCurrentUser();

  const allEntries = await prisma.moodEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 20, // enough for chart (11) + comparison (10), with margin
  });

  const toDetail = (e: (typeof allEntries)[number]): MoodEntryDetail => ({
    id: e.id,
    date: e.date.toISOString(),
    mood: e.mood,
    sleepHours: e.sleepHours,
    feelings: e.feelings,
    reflection: e.reflection,
  });

  const chartEntries = allEntries
    .slice(0, 11)
    .map(toDetail)
    .reverse(); // ascending for the chart's left-to-right timeline

  const calendarEntries = allEntries.map(toDetail);

  let recent: { avgMood: number; avgSleep: number } | null = null;
  let previous: { avgMood: number; avgSleep: number } | null = null;
  if (allEntries.length >= 10) {
    const recentFive = allEntries.slice(0, 5);
    const previousFive = allEntries.slice(5, 10);
    recent = {
      avgMood: average(recentFive.map((e) => e.mood)),
      avgSleep: average(recentFive.map((e) => e.sleepHours)),
    };
    previous = {
      avgMood: average(previousFive.map((e) => e.mood)),
      avgSleep: average(previousFive.map((e) => e.sleepHours)),
    };
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-xl font-semibold">History</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Last {chartEntries.length} entries
        </h2>
        <MoodChart entries={chartEntries} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">This month</h2>
        <MoodCalendar entries={calendarEntries} />
      </section>

      <MoodComparisonCard recent={recent} previous={previous} />
    </div>
  );
}
