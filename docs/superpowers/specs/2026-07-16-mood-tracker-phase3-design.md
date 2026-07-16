# Mood Tracking App — Phase 3 (Reminder Notifications) Design

Continuation of the mood-tracker pivot on the `mood-tracker` branch. Phases 1-2 are
complete (see `docs/superpowers/specs/2026-07-15-mood-tracker-phase1-design.md` and
`2026-07-16-mood-tracker-phase2-design.md`). This spec covers **Phase 3 only**: a daily
Web Push reminder to log a mood entry.

## Scope

One reminder per day, at a user-chosen local time, delivered as a real browser push
notification (works with the tab closed), skipped when today's entry is already logged.
Configured from the settings page. Single demo user, as everywhere else in the app.

## Channel decision

Web Push, not email (no third-party account/API key) and not an in-app banner (not a
real notification). Requires:

- **`web-push` npm package** — the one new dependency this phase adds. VAPID request
  signing is JOSE/ECDSA crypto; hand-rolling it is not reasonable.
- **VAPID keypair** — self-generated (`npx web-push generate-vapid-keys`), free, stored
  as env vars.
- **Service worker** — `public/sw.js`.

## Secrets / environment

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public half of VAPID keypair; needed client-side for `pushManager.subscribe` |
| `VAPID_PRIVATE_KEY` | Private half; server-side only, used by `web-push` |
| `CRON_SECRET` | Shared secret the cron caller must present; requests without it get 401 |

All three documented in `docs/deployment/README.md` (generation command included).
Never committed.

## Scheduler

Vercel Hobby crons fire at most once per day, but a user-chosen reminder time needs an
hourly check. Decision: **external cron service** (e.g. cron-job.org, free) hits
`GET /api/reminders/run` hourly with the secret. One-time manual setup outside the
repo, documented in the deployment README. No `vercel.json`/`vercel.ts` cron entry.

## Schema (additive only — existing models unchanged except new User fields)

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
}

// New fields on User:
//   reminderEnabled      Boolean   @default(false)
//   reminderTime         String?   // "HH:MM", 24h — e.g. "20:00"
//   timezone             String?   // IANA zone captured from the browser, e.g. "Asia/Manila"
//   reminderLastSentDate DateTime? // UTC-midnight date of last send — dedup guard
```

One `PushSubscription` row per browser/device (multiple browsers can each subscribe;
all get the reminder). Subscriptions are not tied to the User row — single-user app,
and the Web Push endpoint itself is the identity that matters.

## Service worker (`public/sw.js`)

Plain JS, no build step:

- `push` event → `showNotification` with title "HirAIya Mood", body from the push
  payload (default "How are you feeling today?"), the app's icon.
- `notificationclick` → close the notification, focus an existing app window or open
  `/`.

## Settings UI

New "Daily reminder" section on `/settings` (client component):

- **Enable toggle**: on enable → `Notification.requestPermission()` →
  `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
  → server action saves the subscription (upsert on `endpoint`) and sets
  `reminderEnabled: true` plus time/timezone. Permission denied → toast error, toggle
  stays off.
- **Time picker**: `<input type="time">`, default "20:00". Saved as `"HH:MM"`.
- **Timezone**: captured silently via `Intl.DateTimeFormat().resolvedOptions().timeZone`
  whenever settings are saved. Never asked, never shown as an input (shown read-only as
  "Reminders in <zone> time").
- **Disable**: unsubscribes the browser's push subscription, server action deletes that
  subscription row and sets `reminderEnabled: false`.

Server actions follow the app's existing contract: return `{ error: string }` on
failure, `undefined` on success; Zod-validate input; `revalidatePath("/settings")`.

## Send path — `GET /api/reminders/run`

Route Handler, `force-dynamic`. Steps:

1. Auth: `secret` query param (or `Authorization: Bearer`) must equal `CRON_SECRET`;
   otherwise 401. If `CRON_SECRET` is unset, 500 — never run open.
2. Load the user. Skip (200, `{ sent: false, reason }`) when any of:
   - `reminderEnabled` is false or `reminderTime`/`timezone` missing
   - current hour in the user's IANA timezone ≠ the hour of `reminderTime`
     (computed via `Intl.DateTimeFormat` with `timeZone`, no date libraries)
   - an entry already exists for `todayUTC()`
   - `reminderLastSentDate` equals `todayUTC()` (already sent — dedup across cron
     retries within the same hour)
3. Send the push (`web-push`) to **all** stored subscriptions, payload
   `{ title: "HirAIya Mood", body: "How are you feeling today?" }`.
4. Any subscription returning `404`/`410` (gone) is deleted from the DB.
5. Set `reminderLastSentDate = todayUTC()` if at least one send succeeded.
6. Respond 200 with a small JSON summary (`{ sent, delivered, removed }`); the cron
   service treats non-200 as failure.

Minute-level precision is deliberately not promised: the cron fires hourly, so the
reminder arrives within the hour containing `reminderTime`. The time picker still
stores minutes for future finer scheduling, but matching is by hour.

**Known quirk (accepted):** "already logged today" and the dedup guard use the app's
UTC day model (`todayUTC()`), while the reminder hour uses the user's local time. This
matches how the entire app defines "today" (entries are keyed to UTC midnight). For a
user far from UTC this can skip a reminder near their local midnight; acceptable for a
single-demo-user portfolio app, consistent by design.

## Verification limits (this environment)

No real browser is available during implementation, so:

- The cron endpoint IS verifiable via curl: auth (401/500 paths), hour matching,
  skip-when-logged, and dedup are all fully testable. Dead-subscription cleanup is
  partially testable: seeding a fake subscription row makes `web-push` fail to
  deliver, which exercises the failure-handling branch — but a true 404/410 "gone"
  response needs a once-valid real endpoint, so the delete-on-410 line itself is
  verified by code review rather than execution.
- Actual notification display, permission prompt, and service-worker behavior can only
  be tested manually in a browser post-deploy. This is documented as an explicit
  follow-up step for the user, not silently skipped.

## Out of scope for Phase 3

Multiple reminders per day, per-device reminder settings, email fallback, snooze,
notification history, Vercel Pro native crons. Phases 4-5 (weather, ML) untouched.
