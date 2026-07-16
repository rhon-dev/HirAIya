import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { ReminderSettings } from "@/components/reminder-settings";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <ProfileForm defaultValues={{ name: user.name, avatar: user.avatar ?? "" }} />
      <ReminderSettings
        defaults={{
          enabled: user.reminderEnabled,
          time: user.reminderTime ?? "20:00",
          timezone: user.timezone,
        }}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Export data</h2>
        <p className="text-sm text-muted-foreground">
          Download all your mood entries.
        </p>
        <div className="flex gap-4 text-sm">
          <a href="/export/csv" className="underline underline-offset-4 hover:text-foreground">
            Export as CSV
          </a>
          <a href="/export/json" className="underline underline-offset-4 hover:text-foreground">
            Export as JSON
          </a>
        </div>
      </section>
    </div>
  );
}
