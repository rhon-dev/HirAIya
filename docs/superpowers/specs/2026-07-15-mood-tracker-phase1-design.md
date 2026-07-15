# Mood Tracking App — Phase 1 (Core) Design

Source challenge: https://www.frontendmentor.io/challenges/mood-tracking-app-E2XeKhDF0B

## Context

This is a pivot of the `hirAIya` repo (previously a feedback/voting platform) onto a new
`mood-tracker` branch. `main` is left untouched as the feedback platform. Stack is reused
as-is: Next.js (App Router), Prisma + Neon Postgres, shadcn/ui, server actions for mutations,
Zod + react-hook-form for validation.

## Scope

Full feature set was decomposed into 5 sequential phases (see project decision log). This
spec covers **Phase 1 only**:

1. Core mood tracker (this spec)
2. Data export (CSV/JSON)
3. Scheduled reminder notifications
4. Weather API correlation
5. ML mood pattern insights

Phases 2-5 are out of scope here and will get their own spec when reached.

## Auth model

Single demo user, no login screen — reused pattern from hirAIya but simpler (no role
switching; mood tracking is inherently single-user/personal). One seeded `User` row loads
automatically. Settings page edits name/avatar directly on that row.

## Data model

```prisma
model User {
  id       String      @id @default(cuid())
  name     String
  avatar   String?
  entries  MoodEntry[]
}

model MoodEntry {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  date        DateTime // day only, normalized to midnight UTC
  mood        Int      // 1-5 (Very Sad..Very Happy)
  sleepHours  Float
  feelings    String[] // multi-select tags e.g. ["Anxious","Grateful"]
  reflection  String?  // free text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, date])
}
```

`@@unique([userId, date])` enforces one entry per calendar day and backs the "editable
until midnight" rule: same day = update (upsert), new day = insert. Date normalization
to midnight UTC avoids timezone edge cases when checking "is there already an entry for
today."

## Mood scale

5-point emoji scale: Very Sad / Sad / Neutral / Happy / Very Happy (values 1-5). Chosen
over a 10-point numeric scale for simplicity of charting, averaging, and quote selection.

## Pages & components

```
/                     → Today's entry (form if not logged yet, summary + edit if already logged)
/history              → Chart of last 11 entries + calendar view + 5-vs-5 comparison
/settings             → Edit name/avatar
```

- **Entry form**: mood (5 emoji buttons), sleep hours (number input, 0-24), feelings
  (multi-select tag chips), reflection (optional textarea). Zod validation: mood required,
  sleep 0-24, reflection optional.
- **Today view**: shows saved entry + a mood quote for that mood level + "Edit" button
  (swaps back to the form, pre-filled).
- **Chart**: Recharts bar chart (already a dependency in this codebase), last 11
  `MoodEntry` rows ordered by date ascending. Clicking a bar opens a detail popover
  (date, mood, sleep, feelings, reflection).
- **Calendar**: month grid, each logged day shows its mood emoji. Clicking a day opens
  the same detail popover as the chart.
- **Comparison card**: average mood + average sleep for the last 5 entries vs. the 5
  before that, shown as a delta (↑/↓). If fewer than 10 entries exist total, the card
  shows "Not enough data yet" instead of a misleading partial average.

## Mood quotes

Static `lib/quotes.ts` — 6-8 quotes per mood level (30-40 quotes total, no external API).
Quote for an entry is picked deterministically from a hash of `entry.id`, so it's stable
across re-renders/refreshes rather than re-rolling randomly each time.

## Server actions

- `saveMoodEntry` — upsert on `[userId, date]`, Zod-validated, `revalidatePath` on success.
  Reuses the transaction-safe action pattern from hirAIya's vote/comment actions.
- `updateUserProfile` — updates name/avatar for the single demo user.

## Analytics query (5-vs-5 comparison)

Server-side: fetch the last 10 entries ordered by date descending, split into
`[0-4]` (recent 5) and `[5-9]` (previous 5), average `mood` and `sleepHours` per group.
Guard for <10 total entries (see Comparison card above).

## Error handling

- Inline form validation via Zod + react-hook-form (same as hirAIya).
- No entry for today → render form. Entry exists for today → render summary/edit view.
  This check is a single query keyed on `[userId, todayUTC]`.

## Out of scope for Phase 1

ML pattern detection, weather API correlation, CSV/JSON export, scheduled notifications —
all deferred to their own later phases per the phase order above.
