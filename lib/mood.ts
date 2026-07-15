export const MOOD_LEVELS = [
  { value: 1, label: "Very Sad", emoji: "😢" },
  { value: 2, label: "Sad", emoji: "🙁" },
  { value: 3, label: "Neutral", emoji: "😐" },
  { value: 4, label: "Happy", emoji: "🙂" },
  { value: 5, label: "Very Happy", emoji: "😄" },
] as const;

export const MOOD_LABELS: Record<number, string> = Object.fromEntries(
  MOOD_LEVELS.map((m) => [m.value, m.label])
);

export const MOOD_EMOJI: Record<number, string> = Object.fromEntries(
  MOOD_LEVELS.map((m) => [m.value, m.emoji])
);

// Normalizes any Date to midnight UTC on the same calendar day —
// used so "does today already have an entry" never depends on server timezone.
export function normalizeToUTCDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function todayUTC(): Date {
  return normalizeToUTCDate(new Date());
}
