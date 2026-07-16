"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveReminderSettings, disableReminder } from "@/app/actions";

type Props = {
  defaults: { enabled: boolean; time: string; timezone: string | null };
  vapidPublicKey: string;
};

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export function ReminderSettings({ defaults, vapidPublicKey }: Props) {
  const [enabled, setEnabled] = useState(defaults.enabled);
  const [time, setTime] = useState(defaults.time);
  const [timezone, setTimezone] = useState(defaults.timezone);
  const [pending, startTransition] = useTransition();

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  async function subscribeAndSave(): Promise<boolean> {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      toast.error("Could not read the push subscription");
      return false;
    }
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = await saveReminderSettings({
      time,
      timezone: zone,
      subscription: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
    });
    if (result?.error) {
      toast.error(result.error);
      return false;
    }
    setTimezone(zone);
    return true;
  }

  function handleEnable() {
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission was denied");
          return;
        }
        if (await subscribeAndSave()) {
          setEnabled(true);
          toast.success("Daily reminder enabled");
        }
      } catch {
        toast.error("Could not enable reminders in this browser");
      }
    });
  }

  function handleUpdateTime() {
    startTransition(async () => {
      try {
        if (await subscribeAndSave()) {
          toast.success("Reminder time updated");
        }
      } catch {
        toast.error("Could not update the reminder");
      }
    });
  }

  function handleDisable() {
    startTransition(async () => {
      try {
        const subscription = await getCurrentSubscription();
        const endpoint = subscription?.endpoint;
        if (subscription) await subscription.unsubscribe();
        if (endpoint) {
          const result = await disableReminder({ endpoint });
          if (result?.error) {
            toast.error(result.error);
            return;
          }
        }
        setEnabled(false);
        toast.success("Daily reminder disabled");
      } catch {
        toast.error("Could not disable the reminder");
      }
    });
  }

  if (!supported) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Daily reminder</h2>
        <p className="text-sm text-muted-foreground">
          Push notifications are not supported in this browser.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Daily reminder</h2>
      <p className="text-sm text-muted-foreground">
        Get a push notification when you haven&apos;t logged your mood yet.
      </p>
      <div className="flex items-center gap-3">
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-32"
          disabled={pending}
        />
        {enabled ? (
          <>
            <Button variant="outline" onClick={handleUpdateTime} disabled={pending}>
              Update time
            </Button>
            <Button variant="ghost" onClick={handleDisable} disabled={pending}>
              Disable
            </Button>
          </>
        ) : (
          <Button onClick={handleEnable} disabled={pending}>
            Enable reminders
          </Button>
        )}
      </div>
      {enabled && timezone ? (
        <p className="text-xs text-muted-foreground">
          Reminders in {timezone} time, within the hour of {time}.
        </p>
      ) : null}
    </section>
  );
}
