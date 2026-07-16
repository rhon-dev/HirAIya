// Pure reminder-decision logic. No DB, no env — testable in isolation.

export type ReminderUser = {
  reminderEnabled: boolean;
  reminderTime: string | null; // "HH:MM"
  timezone: string | null; // IANA zone
  reminderLastSentDate: Date | null; // UTC midnight
};

export function currentHourInZone(now: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  // Some ICU versions format midnight as "24" with hour12: false.
  return Number(hour) % 24;
}

export function shouldSendReminder(
  user: ReminderUser,
  hasEntryToday: boolean,
  todayUtc: Date,
  now: Date
): { send: boolean; reason: string } {
  if (!user.reminderEnabled) return { send: false, reason: "disabled" };
  if (!user.reminderTime || !user.timezone) {
    return { send: false, reason: "not configured" };
  }
  const targetHour = Number(user.reminderTime.slice(0, 2));
  if (currentHourInZone(now, user.timezone) !== targetHour) {
    return { send: false, reason: "hour mismatch" };
  }
  if (hasEntryToday) return { send: false, reason: "already logged" };
  if (
    user.reminderLastSentDate &&
    user.reminderLastSentDate.getTime() === todayUtc.getTime()
  ) {
    return { send: false, reason: "already sent" };
  }
  return { send: true, reason: "due" };
}
