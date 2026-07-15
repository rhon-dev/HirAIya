import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Averages = { avgMood: number; avgSleep: number };

function Delta({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return <span className="text-muted-foreground">→ steady</span>;
  const arrow = diff > 0 ? "↑" : "↓";
  const color = diff > 0 ? "text-green-600" : "text-red-600";
  return (
    <span className={color}>
      {arrow} {Math.abs(diff).toFixed(1)}
    </span>
  );
}

export function MoodComparisonCard({
  recent,
  previous,
}: {
  recent: Averages | null;
  previous: Averages | null;
}) {
  if (!recent || !previous) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Last 5 vs. previous 5</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Not enough data yet — log at least 10 entries to see a comparison.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Last 5 vs. previous 5</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Avg mood: {recent.avgMood.toFixed(1)}/5</span>
          <Delta current={recent.avgMood} previous={previous.avgMood} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Avg sleep: {recent.avgSleep.toFixed(1)}h</span>
          <Delta current={recent.avgSleep} previous={previous.avgSleep} />
        </div>
      </CardContent>
    </Card>
  );
}
