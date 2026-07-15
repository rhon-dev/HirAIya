import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { todayUTC } from "@/lib/mood";
import { TodaySummary } from "@/components/today-summary";
import { MoodEntryForm } from "@/components/mood-entry-form";

export default async function TodayPage() {
  const user = await getCurrentUser();
  const date = todayUTC();

  const entry = await prisma.moodEntry.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}
        </p>
      </div>
      {entry ? <TodaySummary entry={entry} /> : <MoodEntryForm />}
    </div>
  );
}
