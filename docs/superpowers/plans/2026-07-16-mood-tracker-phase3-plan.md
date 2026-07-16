# Mood Tracker Phase 3 (Reminder Notifications) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Daily Web Push reminder to log a mood entry, at a user-chosen local time, skipped when today's entry exists.

**Architecture:** `web-push` + self-generated VAPID keys; `public/sw.js` service worker; reminder config on `User` + a `PushSubscription` table; settings UI subscribes the browser; an external hourly cron hits secret-protected `GET /api/reminders/run` which decides (pure logic in `lib/reminder.ts`) and sends (`lib/push.ts`).

**Tech Stack:** Next.js 16 Route Handlers + server actions, Prisma (`prisma db push` workflow, no migrations), Zod, `web-push` (THE one new dependency), Web Push API / service worker (plain JS, no build step).

**Spec:** `docs/superpowers/specs/2026-07-16-mood-tracker-phase3-design.md` — binding requirements below copied from it.

## Global Constraints

- Exactly one new runtime dependency: `web-push` (plus dev-only `@types/web-push`). Nothing else.
- Env vars: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`. Never committed (`.env*` is git-ignored). Documented in `docs/deployment/README.md` with generation commands.
- Cron endpoint auth: request must present `CRON_SECRET` via `?secret=` or `Authorization: Bearer`; wrong/missing → 401. `CRON_SECRET` unset on the server → 500, never run open. Compare with `crypto.timingSafeEqual`.
- Reminder matching is by HOUR in the user's IANA timezone (computed via `Intl.DateTimeFormat`, no date libraries). Minute-level precision is NOT promised; `reminderTime` still stores `"HH:MM"`.
- Skip conditions, in this order: disabled → not configured → hour mismatch → entry already exists for `todayUTC()` → `reminderLastSentDate === todayUTC()` (dedup). Response is always 200 JSON for skips: `{ sent: false, reason }`.
- Push payload: `{ title: "HirAIya Mood", body: "How are you feeling today?" }`.
- Subscriptions returning HTTP 404/410 on send are deleted from the DB.
- `reminderLastSentDate` set to `todayUTC()` only when at least one send succeeded.
- Server actions follow the existing contract: Zod-validate, return `{ error: string }` or `undefined`, `revalidatePath("/settings")`. `ActionResult` type already exists in `app/actions.ts`.
- Timezone captured silently client-side via `Intl.DateTimeFormat().resolvedOptions().timeZone`; shown read-only, never an input.
- All "today" checks use `todayUTC()` from `@/lib/mood` (documented app-wide convention).
- Schema changes applied with `npx prisma db push` (project convention — no migration files).
- Project has NO automated test framework by design — verification is `npx tsc --noEmit`, `npm run build`, tsx scratch scripts (in the session scratchpad, NEVER in the repo, never committed), and curl against the dev server.
- Browser-only behavior (permission prompt, actual notification display, service worker) CANNOT be tested in this environment — say so in reports; do not fabricate a pass. Documented as a post-deploy manual step.
- This is NOT the Next.js you know (`AGENTS.md`): consult `node_modules/next/dist/docs/` if any Next API looks unfamiliar.

---

### Task 1: Dependency, schema, env, deployment docs

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `prisma/schema.prisma`
- Modify: `docs/deployment/README.md`
- Local only (NOT committed): append to `.env`

**Interfaces:**
- Produces: `PushSubscription` Prisma model; `User.reminderEnabled/reminderTime/timezone/reminderLastSentDate` fields; `web-push` importable; env vars available locally for later tasks' verification.

- [ ] **Step 1: Install dependency**

```bash
npm install web-push
npm install -D @types/web-push
```

- [ ] **Step 2: Extend `prisma/schema.prisma`**

Add to the `User` model (after `createdAt`):

```prisma
  reminderEnabled      Boolean   @default(false)
  reminderTime         String?   // "HH:MM", 24h — e.g. "20:00"
  timezone             String?   // IANA zone captured from the browser
  reminderLastSentDate DateTime? // UTC-midnight date of last send — dedup guard
```

Add as a new model at the end of the file:

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: Push schema + regenerate client**

```bash
npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema" and client regenerated. (Confirm `DATABASE_URL` in `.env` is the dev database — see `docs/deployment/README.md#incident-log`.)

- [ ] **Step 4: Generate local dev secrets (NOT committed)**

```bash
npx web-push generate-vapid-keys
```

Append to `.env` (using the generated values):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<publicKey from output>"
VAPID_PRIVATE_KEY="<privateKey from output>"
CRON_SECRET="dev-cron-secret-change-in-prod"
```

Verify `.env` is git-ignored: `git check-ignore .env` prints `.env`.

- [ ] **Step 5: Document in `docs/deployment/README.md`**

Add a section (before the incident log):

```markdown
## Phase 3: reminder notification env vars

Web Push reminders need three env vars (local `.env` AND Vercel project settings):

| Var | How to get it |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` (public half) |
| `VAPID_PRIVATE_KEY` | same command (private half) |
| `CRON_SECRET` | any long random string, e.g. `openssl rand -hex 32` |

Generate the VAPID pair ONCE and reuse it everywhere — subscriptions are bound to the
public key, so rotating it invalidates every existing subscription.

The reminder check is triggered by an external cron service (Vercel Hobby crons are
daily-only): configure cron-job.org (free) to call
`GET https://<deployment>/api/reminders/run?secret=<CRON_SECRET>` every hour, at
minute 0. Non-200 responses count as failures in the cron dashboard.
```

- [ ] **Step 6: Build + commit**

```bash
npm run build
```

Expected: success (schema change is additive; nothing consumes it yet).

```bash
git add package.json package-lock.json prisma/schema.prisma docs/deployment/README.md
git commit -m "Add web-push dependency, reminder schema fields, and env docs"
```

Confirm `git status` shows `.env` NOT staged.

---

### Task 2: Service worker + pure reminder logic

**Files:**
- Create: `public/sw.js`
- Create: `lib/reminder.ts`

**Interfaces:**
- Consumes: nothing from other tasks (pure).
- Produces (Task 5 relies on exact signatures):
  - `currentHourInZone(now: Date, timeZone: string): number`
  - `shouldSendReminder(user: ReminderUser, hasEntryToday: boolean, todayUtc: Date, now: Date): { send: boolean; reason: string }`
  - `type ReminderUser = { reminderEnabled: boolean; reminderTime: string | null; timezone: string | null; reminderLastSentDate: Date | null }`

- [ ] **Step 1: Write `public/sw.js`** (plain JS — this file is served verbatim, no TS/build)

```js
self.addEventListener("push", (event) => {
  let data = { title: "HirAIya Mood", body: "How are you feeling today?" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      // keep defaults on malformed payload
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow("/");
      })
  );
});
```

- [ ] **Step 2: Write `lib/reminder.ts`**

```ts
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
```

- [ ] **Step 3: Verify pure logic with a scratch script (do NOT commit)**

Scratchpad file `verify-reminder.ts`, run from repo root with `npx tsx <path>` (import `lib/reminder` by absolute path if relative resolution is awkward):

```ts
import { currentHourInZone, shouldSendReminder } from "/Users/Develop/hirAIya/lib/reminder";

const ok = (cond: boolean, msg: string) => {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("OK: " + msg);
};

// 2026-07-16T12:30:00Z
const now = new Date(Date.UTC(2026, 6, 16, 12, 30));
ok(currentHourInZone(now, "UTC") === 12, "UTC hour");
ok(currentHourInZone(now, "Asia/Manila") === 20, "Manila = UTC+8");
ok(currentHourInZone(now, "America/New_York") === 8, "NY = UTC-4 (EDT in July)");
// midnight edge: 2026-07-16T16:00:00Z = 00:00 next day in Manila
ok(currentHourInZone(new Date(Date.UTC(2026, 6, 16, 16, 0)), "Asia/Manila") === 0, "midnight formats as 0, not 24");

const today = new Date(Date.UTC(2026, 6, 16));
const base = { reminderEnabled: true, reminderTime: "20:00", timezone: "Asia/Manila", reminderLastSentDate: null };

ok(shouldSendReminder(base, false, today, now).send === true, "due");
ok(shouldSendReminder({ ...base, reminderEnabled: false }, false, today, now).reason === "disabled", "disabled");
ok(shouldSendReminder({ ...base, reminderTime: null }, false, today, now).reason === "not configured", "no time");
ok(shouldSendReminder({ ...base, timezone: null }, false, today, now).reason === "not configured", "no zone");
ok(shouldSendReminder({ ...base, reminderTime: "21:00" }, false, today, now).reason === "hour mismatch", "wrong hour");
ok(shouldSendReminder(base, true, today, now).reason === "already logged", "entry exists");
ok(shouldSendReminder({ ...base, reminderLastSentDate: today }, false, today, now).reason === "already sent", "dedup");
ok(shouldSendReminder({ ...base, reminderLastSentDate: new Date(Date.UTC(2026, 6, 15)) }, false, today, now).send === true, "yesterday's send doesn't block");
console.log("ALL OK");
```

Expected: `ALL OK`.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add public/sw.js lib/reminder.ts
git commit -m "Add service worker and pure reminder-decision logic"
```

---

### Task 3: Push sender, validation, server actions

**Files:**
- Create: `lib/push.ts`
- Modify: `lib/validation.ts` (append)
- Modify: `app/actions.ts` (append)

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`; `getCurrentUser()` from `@/lib/auth`; `ActionResult` type already defined in `app/actions.ts`.
- Produces:
  - `sendPushToAll(payload: { title: string; body: string }): Promise<{ delivered: number; removed: number }>` (Task 5 uses this)
  - `saveReminderSettings(input: ReminderSettingsInput): Promise<ActionResult>` and `disableReminder(input: DisableReminderInput): Promise<ActionResult>` (Task 4 uses these)
  - `reminderSettingsSchema`, `disableReminderSchema` + inferred input types in `lib/validation.ts`

- [ ] **Step 1: Write `lib/push.ts`**

```ts
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Sends a push to every stored subscription. Subscriptions the push service
// reports gone (404/410) are deleted; other failures are left in place so a
// transient outage doesn't wipe valid subscriptions.
export async function sendPushToAll(payload: {
  title: string;
  body: string;
}): Promise<{ delivered: number; removed: number }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails("mailto:admin@hiraiya.dev", publicKey, privateKey);

  const subscriptions = await prisma.pushSubscription.findMany();
  let delivered = 0;
  let removed = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
        removed++;
      }
    }
  }
  return { delivered, removed };
}
```

- [ ] **Step 2: Append to `lib/validation.ts`**

```ts
export const reminderSettingsSchema = z.object({
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM (24-hour)"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  subscription: z.object({
    endpoint: z.string().url("Invalid subscription endpoint"),
    keys: z.object({
      p256dh: z.string().min(1, "Missing subscription key"),
      auth: z.string().min(1, "Missing subscription key"),
    }),
  }),
});

export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;

export const disableReminderSchema = z.object({
  endpoint: z.string().url("Invalid subscription endpoint"),
});

export type DisableReminderInput = z.infer<typeof disableReminderSchema>;
```

- [ ] **Step 3: Append to `app/actions.ts`** (extend the existing import from `@/lib/validation` with the new schema/type names rather than adding a duplicate import line)

```ts
export async function saveReminderSettings(
  input: ReminderSettingsInput
): Promise<ActionResult> {
  const parsed = reminderSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  const { time, timezone, subscription } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { reminderEnabled: true, reminderTime: time, timezone },
  });

  revalidatePath("/settings");
}

export async function disableReminder(
  input: DisableReminderInput
): Promise<ActionResult> {
  const parsed = disableReminderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { reminderEnabled: false },
  });

  revalidatePath("/settings");
}
```

- [ ] **Step 4: Typecheck + build + commit**

```bash
npx tsc --noEmit
npm run build
git add lib/push.ts lib/validation.ts app/actions.ts
git commit -m "Add push sender, reminder validation, and reminder server actions"
```

---

### Task 4: Reminder settings UI

**Files:**
- Create: `components/reminder-settings.tsx`
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Consumes: `saveReminderSettings` / `disableReminder` from `@/app/actions` (Task 3); `Button` from `@/components/ui/button`, `Input` from `@/components/ui/input`, `toast` from `sonner` (existing patterns — see `components/profile-form.tsx`).
- Produces: `<ReminderSettings defaults={...} vapidPublicKey={...} />`.

- [ ] **Step 1: Write `components/reminder-settings.tsx`**

```tsx
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
```

- [ ] **Step 2: Wire into `app/settings/page.tsx`**

Add import and render the section between `ProfileForm` and the export section:

```tsx
import { ReminderSettings } from "@/components/reminder-settings";
```

```tsx
      <ReminderSettings
        defaults={{
          enabled: user.reminderEnabled,
          time: user.reminderTime ?? "20:00",
          timezone: user.timezone,
        }}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
```

- [ ] **Step 3: Build + render check**

```bash
npm run build
```

Start `npm run dev` (note port), then:

```bash
curl -s http://localhost:3000/settings | grep -c "Daily reminder"
```

Expected: `1` (or more). Stop the dev server. Browser-side behavior (permission, subscribe) is NOT verifiable here — state that plainly in the report.

- [ ] **Step 4: Commit**

```bash
git add components/reminder-settings.tsx app/settings/page.tsx
git commit -m "Add daily reminder settings UI with push subscription flow"
```

---

### Task 5: Cron endpoint + end-to-end verification + docs

**Files:**
- Create: `app/api/reminders/run/route.ts`
- Modify: `docs/agents/PHASES-REFERENCE.md`

**Interfaces:**
- Consumes: `shouldSendReminder` + `ReminderUser` from `@/lib/reminder` (Task 2); `sendPushToAll` from `@/lib/push` (Task 3); `getCurrentUser`, `prisma`, `todayUTC` (existing).
- Produces: `GET /api/reminders/run` — the endpoint the external cron calls.

- [ ] **Step 1: Write `app/api/reminders/run/route.ts`**

```ts
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { todayUTC } from "@/lib/mood";
import { shouldSendReminder } from "@/lib/reminder";
import { sendPushToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const url = new URL(request.url);
  const provided =
    url.searchParams.get("secret") ??
    request.headers.get("authorization")?.replace(/^Bearer /, "") ??
    "";
  if (!secretsMatch(provided, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getCurrentUser();
  const today = todayUTC();
  const entry = await prisma.moodEntry.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });
  const decision = shouldSendReminder(user, entry !== null, today, new Date());
  if (!decision.send) {
    return Response.json({ sent: false, reason: decision.reason });
  }

  const { delivered, removed } = await sendPushToAll({
    title: "HirAIya Mood",
    body: "How are you feeling today?",
  });
  if (delivered > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { reminderLastSentDate: today },
    });
  }
  return Response.json({ sent: delivered > 0, delivered, removed });
}
```

(`user` satisfies `ReminderUser` structurally — the Prisma `User` now carries all four fields.)

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: success; route list includes `ƒ /api/reminders/run`.

- [ ] **Step 3: Verify via curl + scratch DB script (do NOT commit scripts; restore DB state after)**

Start `npm run dev` (note port). Then, with `SECRET` = the `CRON_SECRET` value from `.env`:

1. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/reminders/run` → `401`
2. `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/reminders/run?secret=wrong"` → `401`
3. `curl -s "http://localhost:3000/api/reminders/run?secret=$SECRET"` → `{"sent":false,"reason":"disabled"}` (seed user has reminders off)
4. Scratch tsx script: set the user's `reminderEnabled: true`, `reminderTime` = the CURRENT hour in `"UTC"` (compute `String(new Date().getUTCHours()).padStart(2, "0") + ":00"`), `timezone: "UTC"`, and insert a fake `PushSubscription` (`endpoint: "https://updates.push.services.mozilla.com/wpush/v2/fake-endpoint-for-verification"`, `p256dh: "BFakeKeyForVerificationOnly"`, `auth: "FakeAuthValue"`).
5. Curl again with the correct secret:
   - If the seed's entry for today exists → expect `{"sent":false,"reason":"already logged"}`. Then scratch-delete today's entry and curl again.
   - With no entry today → the send path runs; the fake subscription fails delivery (bad keys/endpoint), so expect `{"sent":false,"delivered":0,...}` — this VERIFIES the failure branch doesn't crash the route. `removed` may be 0 or 1 depending on the push service's response; report what happened.
6. Set `reminderTime` to a non-current hour, curl → `{"sent":false,"reason":"hour mismatch"}`.
7. Restore DB state with the scratch script: `reminderEnabled: false`, `reminderTime: null`, `timezone: null`, `reminderLastSentDate: null`, delete the fake subscription, re-create today's entry ONLY if step 5 deleted one (re-run `npm run db:seed` is acceptable — it rebuilds the standard 14 entries).

Stop the dev server. Report every curl command + response verbatim. The true-delivery path (real browser subscription receiving a notification) is NOT verifiable here — say so; it's a documented post-deploy manual step.

- [ ] **Step 4: Update `docs/agents/PHASES-REFERENCE.md`**

Mood tracker table: Phase 3 status `Not started` → `Done`. Below the table add, next to the other spec lines: `Spec for Phase 3: docs/superpowers/specs/2026-07-16-mood-tracker-phase3-design.md.` Adjust the trailing "Phases 3-5 each get their own spec…" sentence to "Phases 4-5 …".

- [ ] **Step 5: Commit**

```bash
git add app/api/reminders/run/route.ts docs/agents/PHASES-REFERENCE.md
git commit -m "Add secret-protected hourly reminder cron endpoint, mark Phase 3 done"
```
