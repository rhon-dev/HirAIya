# Mood Tracker Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hirAIya's feedback-platform code on the `mood-tracker` branch with a working mood tracking app: daily entry logging, today's-entry view with quotes, an 11-entry chart, a calendar view, a 5-vs-5 average comparison, and profile settings.

**Architecture:** Next.js App Router, server components for data-fetching pages, client components for interactive forms/chart/calendar, server actions for all mutations (no REST layer). Single demo user, no login, no roles — simpler than `main`'s auth stub since mood tracking is inherently personal.

**Tech Stack:** Next.js 16, Prisma 7 (`@prisma/adapter-pg` driver adapter, no query-engine binary), Neon/local Postgres, shadcn/ui, react-hook-form + `@hookform/resolvers/zod`, Zod, Recharts, sonner (toasts).

## Global Constraints

- No automated test suite on this project (see `docs/testing/README.md`) — every task is verified by `npm run build` passing plus manually exercising the feature in a browser at `http://localhost:3000` (or the port Next picks if 3000 is busy — check the dev server's own log line for the actual port before opening a browser).
- Local dev DB is a local Postgres reachable via the `DATABASE_URL` already in `.env` (`postgresql://postgres:postgres@localhost:51214/loopboard?sslmode=disable`) — do not touch this file; it's already correct for local iteration.
- All dates are normalized to midnight UTC when compared for "is this today's entry" — never compare using local server timezone.
- Reuse existing shadcn primitives in `components/ui/` (`button`, `card`, `input`, `textarea`, `select`, `dialog`, `skeleton`, `sonner`, `avatar`, `badge`) — do not add new shadcn components unless a task explicitly says to.
- Every server action returns `{ error: string } | undefined` (never throws across the server/client boundary) — this is the existing convention in `app/feedback/actions.ts`, keep it.
- Commit after every task.

---

### Task 1: Replace Prisma schema and remove feedback-platform code

**Files:**
- Modify: `prisma/schema.prisma` (replace entirely)
- Delete: `app/feedback/`, `app/comments/`, `app/users/`, `app/votes/`, `app/admin/`, `app/roadmap/`
- Delete: `components/feedback-form.tsx`, `components/feedback-badges.tsx`, `components/board-controls.tsx`, `components/category-chart.tsx`, `components/comment-form.tsx`, `components/comment-thread.tsx`, `components/delete-feedback-button.tsx`, `components/status-select.tsx`, `components/user-switcher.tsx`, `components/vote-button.tsx`
- Modify: `lib/auth.ts` (replace entirely — single-user stub, no roles)
- Modify: `lib/validation.ts` (replace entirely — mood entry + profile schemas)

**Interfaces:**
- Produces: `User` model (`id`, `name`, `avatar`, `entries`), `MoodEntry` model (`id`, `userId`, `date`, `mood`, `sleepHours`, `feelings: String[]`, `reflection`, `createdAt`, `updatedAt`), unique constraint `@@unique([userId, date])`.
- Produces: `getCurrentUser(): Promise<User>` in `lib/auth.ts` — no cookie, no role, just the single seeded user.
- Produces: `moodEntrySchema` (Zod) and `MoodEntryInput` type, `profileSchema` and `ProfileInput` type in `lib/validation.ts`.

- [ ] **Step 1: Replace `prisma/schema.prisma`**

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String      @id @default(cuid())
  name      String
  avatar    String?
  entries   MoodEntry[]
  createdAt DateTime    @default(now())
}

model MoodEntry {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  date       DateTime // normalized to midnight UTC
  mood       Int      // 1 (Very Sad) .. 5 (Very Happy)
  sleepHours Float
  feelings   String[]
  reflection String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([userId, date])
}
```

- [ ] **Step 2: Delete feedback-platform app routes and components**

```bash
rm -rf app/feedback app/comments app/users app/votes app/admin app/roadmap
rm -f components/feedback-form.tsx components/feedback-badges.tsx components/board-controls.tsx components/category-chart.tsx components/comment-form.tsx components/comment-thread.tsx components/delete-feedback-button.tsx components/status-select.tsx components/user-switcher.tsx components/vote-button.tsx
```

- [ ] **Step 3: Replace `lib/auth.ts`**

```typescript
import { prisma } from "@/lib/prisma";
import type { User } from "@/app/generated/prisma/client";

// Single demo user, no login, no roles — mood tracking is inherently personal,
// so there's no multi-user/role-switcher like the feedback platform had.
export async function getCurrentUser(): Promise<User> {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No user seeded — run `npm run db:seed`");
  return user;
}
```

- [ ] **Step 4: Replace `lib/validation.ts`**

```typescript
import { z } from "zod";

export const moodEntrySchema = z.object({
  mood: z
    .number()
    .int()
    .min(1, "Mood is required")
    .max(5, "Mood is required"),
  sleepHours: z
    .number()
    .min(0, "Sleep hours must be between 0 and 24")
    .max(24, "Sleep hours must be between 0 and 24"),
  feelings: z.array(z.string()).default([]),
  reflection: z
    .string()
    .max(2000, "Reflection must be at most 2000 characters")
    .optional()
    .or(z.literal("")),
});

export type MoodEntryInput = z.infer<typeof moodEntrySchema>;

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  avatar: z
    .string()
    .trim()
    .url("Avatar must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
```

- [ ] **Step 5: Push schema to local DB and regenerate client**

Run: `npx prisma db push`
Expected: `🚀 Your database is now in sync with your Prisma schema.` (this drops the old feedback-platform tables on the local DB — expected, `main` branch is unaffected since it uses its own local DB state when checked out separately).

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Fails at this point because `app/page.tsx`, `components/site-header.tsx`, `prisma/seed.ts` still reference deleted feedback code — that's expected, they get fixed in Tasks 2-4. Confirm the failure is *only* in those files (no unrelated errors) before moving on.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Replace feedback-platform schema/auth/validation with mood-tracker equivalents"
```

---

### Task 2: Mood constants, quotes, and date utilities

**Files:**
- Create: `lib/mood.ts`
- Create: `lib/quotes.ts`

**Interfaces:**
- Consumes: nothing (pure data/utility module).
- Produces: `MOOD_LEVELS` (array of `{ value: 1-5, label: string, emoji: string }`), `MOOD_LABELS: Record<number, string>`, `MOOD_EMOJI: Record<number, string>`, `todayUTC(): Date`, `normalizeToUTCDate(d: Date): Date` — used by Task 4's server actions and Task 6's page.
- Produces: `getQuoteForEntry(entryId: string, mood: number): string` in `lib/quotes.ts`.

- [ ] **Step 1: Create `lib/mood.ts`**

```typescript
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
```

- [ ] **Step 2: Create `lib/quotes.ts`**

```typescript
const QUOTES_BY_MOOD: Record<number, string[]> = {
  1: [
    "This feeling is real, and it will pass.",
    "You don't have to have it all figured out today.",
    "Rest is not giving up — it's making room to keep going.",
    "It's okay to not be okay for a while.",
    "Small steps still count as moving forward.",
    "You've gotten through every hard day so far.",
  ],
  2: [
    "Some days ask more of us than others.",
    "Naming a feeling is the first step to easing it.",
    "You're allowed to take today slower than usual.",
    "It's okay to lean on someone right now.",
    "Tomorrow gets to be different from today.",
    "Not every day has to be a good one to be worth living.",
  ],
  3: [
    "An even day is still a day you showed up for.",
    "Neutral is a fine place to rest before the next thing.",
    "Not everything has to be exciting to be enough.",
    "Steady counts, even when it doesn't feel remarkable.",
    "You don't owe today a bigger feeling than it has.",
    "Calm is its own kind of progress.",
  ],
  4: [
    "Let yourself enjoy this without waiting for a catch.",
    "Good days are worth noticing, not just good news days.",
    "This feeling is evidence, not luck.",
    "You're allowed to feel proud of an ordinary good day.",
    "Hold onto this one — it's yours.",
    "A good day doesn't need a big reason.",
  ],
  5: [
    "Let this one really land.",
    "You deserve days that feel this good.",
    "Savor it — you don't need permission to feel great.",
    "This is worth remembering on harder days.",
    "Joy like this is worth naming out loud.",
    "Bank this feeling for later.",
  ],
};

// Deterministic pick so the same entry always shows the same quote
// (stable across refreshes/re-renders instead of re-rolling randomly).
export function getQuoteForEntry(entryId: string, mood: number): string {
  const quotes = QUOTES_BY_MOOD[mood] ?? QUOTES_BY_MOOD[3];
  let hash = 0;
  for (let i = 0; i < entryId.length; i++) {
    hash = (hash * 31 + entryId.charCodeAt(i)) % quotes.length;
  }
  return quotes[Math.abs(hash) % quotes.length];
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/mood.ts lib/quotes.ts
git commit -m "Add mood constants, date utilities, and quote data"
```

---

### Task 3: Seed script for mood-tracker data

**Files:**
- Modify: `prisma/seed.ts` (replace entirely)

**Interfaces:**
- Consumes: `MoodEntry`, `User` from `@/app/generated/prisma/client` (regenerated in Task 1).
- Produces: one seeded `User` ("Ahron"), 14 days of `MoodEntry` rows (enough to exercise the 11-entry chart and the 5-vs-5 comparison, which needs 10).

- [ ] **Step 1: Replace `prisma/seed.ts`**

```typescript
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FEELINGS_POOL = [
  "Anxious", "Grateful", "Tired", "Motivated", "Content",
  "Stressed", "Relaxed", "Hopeful", "Overwhelmed", "Proud",
];

function pickFeelings(seedIndex: number): string[] {
  const a = FEELINGS_POOL[seedIndex % FEELINGS_POOL.length];
  const b = FEELINGS_POOL[(seedIndex + 3) % FEELINGS_POOL.length];
  return a === b ? [a] : [a, b];
}

async function main() {
  await prisma.moodEntry.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { name: "Ahron", avatar: null },
  });

  const moods = [3, 4, 2, 5, 3, 3, 4, 2, 5, 4, 3, 4, 2, 5];
  const sleepHours = [7, 8, 5.5, 8.5, 6, 7, 7.5, 5, 9, 8, 6.5, 7, 5.5, 8];

  const today = new Date();
  const createdEntries = [];
  for (let i = 0; i < moods.length; i++) {
    const daysAgo = moods.length - 1 - i;
    const date = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - daysAgo
    ));
    const entry = await prisma.moodEntry.create({
      data: {
        userId: user.id,
        date,
        mood: moods[i],
        sleepHours: sleepHours[i],
        feelings: pickFeelings(i),
        reflection: i % 2 === 0 ? "A pretty typical day overall." : null,
      },
    });
    createdEntries.push(entry);
  }

  console.log(`Seeded 1 user and ${createdEntries.length} mood entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Run the seed against local DB**

Run: `npm run db:seed`
Expected: `Seeded 1 user and 14 mood entries.`

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "Add mood-tracker seed data (1 user, 14 days of entries)"
```

---

### Task 4: Server actions — save entry, update profile

**Files:**
- Create: `app/actions.ts`

**Interfaces:**
- Consumes: `moodEntrySchema`, `MoodEntryInput`, `profileSchema`, `ProfileInput` from `lib/validation.ts`; `getCurrentUser` from `lib/auth.ts`; `todayUTC`, `normalizeToUTCDate` from `lib/mood.ts`.
- Produces: `saveMoodEntry(input: MoodEntryInput): Promise<{ error: string } | undefined>` (always upserts against today's UTC date — no date parameter, editing is only ever for "today"), `updateProfile(input: ProfileInput): Promise<{ error: string } | undefined>` — consumed by Task 5's form and Task 8's settings form.

- [ ] **Step 1: Create `app/actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { moodEntrySchema, profileSchema, type MoodEntryInput, type ProfileInput } from "@/lib/validation";
import { todayUTC } from "@/lib/mood";

export type ActionResult = { error: string } | undefined;

export async function saveMoodEntry(input: MoodEntryInput): Promise<ActionResult> {
  const parsed = moodEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  const date = todayUTC();

  await prisma.moodEntry.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: {
      userId: user.id,
      date,
      mood: parsed.data.mood,
      sleepHours: parsed.data.sleepHours,
      feelings: parsed.data.feelings,
      reflection: parsed.data.reflection || null,
    },
    update: {
      mood: parsed.data.mood,
      sleepHours: parsed.data.sleepHours,
      feelings: parsed.data.feelings,
      reflection: parsed.data.reflection || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      avatar: parsed.data.avatar || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
}
```

**Note:** `userId_date` is Prisma's auto-generated compound-unique-key name for `@@unique([userId, date])` — matches the field order in the schema exactly (`userId` then `date`).

- [ ] **Step 2: Verify build (actions file compiles in isolation)**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/actions.ts` (errors in other not-yet-updated files are expected at this point).

- [ ] **Step 3: Commit**

```bash
git add app/actions.ts
git commit -m "Add saveMoodEntry and updateProfile server actions"
```

---

### Task 5: Mood entry form component

**Files:**
- Create: `components/mood-entry-form.tsx`

**Interfaces:**
- Consumes: `saveMoodEntry` from `@/app/actions`; `moodEntrySchema`, `MoodEntryInput` from `@/lib/validation`; `MOOD_LEVELS` from `@/lib/mood`.
- Produces: `<MoodEntryForm defaultValues?={Partial<MoodEntryInput>} onSaved?={() => void} />` — consumed by Task 6's today page.

- [ ] **Step 1: Create `components/mood-entry-form.tsx`**

```tsx
"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { saveMoodEntry } from "@/app/actions";
import { moodEntrySchema, type MoodEntryInput } from "@/lib/validation";
import { MOOD_LEVELS } from "@/lib/mood";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const FEELINGS_OPTIONS = [
  "Anxious", "Grateful", "Tired", "Motivated", "Content",
  "Stressed", "Relaxed", "Hopeful", "Overwhelmed", "Proud",
];

export function MoodEntryForm({
  defaultValues,
  onSaved,
}: {
  defaultValues?: Partial<MoodEntryInput>;
  onSaved?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>(
    defaultValues?.feelings ?? []
  );
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MoodEntryInput>({
    resolver: zodResolver(moodEntrySchema),
    defaultValues: {
      mood: defaultValues?.mood ?? 0,
      sleepHours: defaultValues?.sleepHours ?? 8,
      feelings: defaultValues?.feelings ?? [],
      reflection: defaultValues?.reflection ?? "",
    },
  });

  const currentMood = watch("mood");

  function toggleFeeling(feeling: string) {
    const next = selectedFeelings.includes(feeling)
      ? selectedFeelings.filter((f) => f !== feeling)
      : [...selectedFeelings, feeling];
    setSelectedFeelings(next);
    setValue("feelings", next);
  }

  function onSubmit(input: MoodEntryInput) {
    startTransition(async () => {
      const result = await saveMoodEntry(input);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Entry saved");
        onSaved?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">How are you feeling?</label>
        <div className="flex gap-2">
          {MOOD_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setValue("mood", level.value)}
              className={`flex-1 rounded-md border p-3 text-2xl transition ${
                currentMood === level.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              }`}
              aria-label={level.label}
            >
              {level.emoji}
            </button>
          ))}
        </div>
        {errors.mood && (
          <p className="text-sm text-destructive">{errors.mood.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="sleepHours" className="text-sm font-medium">
          Hours of sleep
        </label>
        <Input
          id="sleepHours"
          type="number"
          step="0.5"
          min="0"
          max="24"
          {...register("sleepHours", { valueAsNumber: true })}
        />
        {errors.sleepHours && (
          <p className="text-sm text-destructive">{errors.sleepHours.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Feelings</label>
        <div className="flex flex-wrap gap-2">
          {FEELINGS_OPTIONS.map((feeling) => (
            <button
              key={feeling}
              type="button"
              onClick={() => toggleFeeling(feeling)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                selectedFeelings.includes(feeling)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              }`}
            >
              {feeling}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="reflection" className="text-sm font-medium">
          Reflection (optional)
        </label>
        <Textarea
          id="reflection"
          rows={4}
          placeholder="Anything on your mind?"
          {...register("reflection")}
        />
        {errors.reflection && (
          <p className="text-sm text-destructive">{errors.reflection.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save entry"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/mood-entry-form.tsx
git commit -m "Add mood entry form component"
```

---

### Task 6: Today's page — form or summary + quote

**Files:**
- Create: `components/today-summary.tsx`
- Modify: `app/page.tsx` (replace entirely)
- Delete: `app/loading.tsx` if it references feedback-platform types; recreate as a generic skeleton (see Step 3)

**Interfaces:**
- Consumes: `MoodEntryForm` from `@/components/mood-entry-form`; `getQuoteForEntry` from `@/lib/quotes`; `MOOD_LABELS`, `MOOD_EMOJI`, `todayUTC` from `@/lib/mood`; `getCurrentUser` from `@/lib/auth`; `prisma` from `@/lib/prisma`.
- Produces: `<TodaySummary entry={MoodEntry} onEdit={() => void} />` client component; `app/page.tsx` default export (server component).

- [ ] **Step 1: Create `components/today-summary.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoodEntryForm } from "@/components/mood-entry-form";
import { MOOD_LABELS, MOOD_EMOJI } from "@/lib/mood";
import { getQuoteForEntry } from "@/lib/quotes";

type EntryProps = {
  id: string;
  mood: number;
  sleepHours: number;
  feelings: string[];
  reflection: string | null;
};

export function TodaySummary({ entry }: { entry: EntryProps }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <MoodEntryForm
        defaultValues={{
          mood: entry.mood,
          sleepHours: entry.sleepHours,
          feelings: entry.feelings,
          reflection: entry.reflection ?? "",
        }}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {MOOD_EMOJI[entry.mood]} {MOOD_LABELS[entry.mood]}
          </span>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm italic text-muted-foreground">
          "{getQuoteForEntry(entry.id, entry.mood)}"
        </p>
        <p className="text-sm">Slept {entry.sleepHours} hours</p>
        {entry.feelings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entry.feelings.map((f) => (
              <Badge key={f} variant="secondary">
                {f}
              </Badge>
            ))}
          </div>
        )}
        {entry.reflection && (
          <p className="text-sm text-muted-foreground">{entry.reflection}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Replace `app/page.tsx`**

```tsx
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
          })}
        </p>
      </div>
      {entry ? <TodaySummary entry={entry} /> : <MoodEntryForm />}
    </div>
  );
}
```

- [ ] **Step 3: Replace `app/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Fails only on `components/site-header.tsx` (still references deleted feedback routes/`user-switcher`) — fixed in Task 7. Confirm no other unexpected errors.

- [ ] **Step 5: Commit**

```bash
git add components/today-summary.tsx app/page.tsx app/loading.tsx
git commit -m "Add today's-entry page: form when no entry, summary+quote when logged"
```

---

### Task 7: Site header/navigation for mood tracker

**Files:**
- Modify: `components/site-header.tsx` (replace entirely)
- Modify: `app/layout.tsx` (update metadata only)

**Interfaces:**
- Consumes: nothing external beyond `next/link`.
- Produces: header with nav links `Today` (`/`), `History` (`/history`), `Settings` (`/settings`) — consumed by `app/layout.tsx` (already wired, no change needed to that import).

- [ ] **Step 1: Replace `components/site-header.tsx`**

```tsx
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          HirAIya Mood
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Today
          </Link>
          <Link href="/history" className="hover:text-foreground">
            History
          </Link>
          <Link href="/settings" className="hover:text-foreground">
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update metadata in `app/layout.tsx`**

Find this block:
```tsx
export const metadata: Metadata = {
  title: "HirAIya",
  description: "Public feedback board — submit, vote, and track feature requests.",
};
```

Replace with:
```tsx
export const metadata: Metadata = {
  title: "HirAIya Mood",
  description: "Daily mood tracking — log entries, spot trends, reflect on patterns.",
};
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Succeeds (all Task 1 deletions are now unreferenced). If it fails, read the error — it means some file still imports a deleted component; fix the import before proceeding.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev` (note the port it picks), open `http://localhost:<port>/`
Expected: "Today" page loads showing the mood entry form (no entry for today yet, since seed data is for past days only). Nav shows Today/History/Settings.

- [ ] **Step 5: Commit**

```bash
git add components/site-header.tsx app/layout.tsx
git commit -m "Replace feedback-platform nav with mood-tracker nav"
```

---

### Task 8: Settings page — profile form

**Files:**
- Create: `components/profile-form.tsx`
- Create: `app/settings/page.tsx`

**Interfaces:**
- Consumes: `updateProfile` from `@/app/actions`; `profileSchema`, `ProfileInput` from `@/lib/validation`; `getCurrentUser` from `@/lib/auth`.
- Produces: `<ProfileForm defaultValues={ProfileInput} />`; `app/settings/page.tsx` default export.

- [ ] **Step 1: Create `components/profile-form.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfile } from "@/app/actions";
import { profileSchema, type ProfileInput } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileForm({ defaultValues }: { defaultValues: ProfileInput }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  function onSubmit(input: ProfileInput) {
    startTransition(async () => {
      const result = await updateProfile(input);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="avatar" className="text-sm font-medium">
          Avatar URL (optional)
        </label>
        <Input id="avatar" placeholder="https://…" {...register("avatar")} />
        {errors.avatar && (
          <p className="text-sm text-destructive">{errors.avatar.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/settings/page.tsx`**

```tsx
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <ProfileForm defaultValues={{ name: user.name, avatar: user.avatar ?? "" }} />
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:<port>/settings`, change name, save.
Expected: Toast "Profile updated", header still shows "HirAIya Mood" (header doesn't display the user's name, so no visible change there — confirm via re-visiting `/settings` that the new name persisted in the input's default value after a refresh).

- [ ] **Step 4: Commit**

```bash
git add components/profile-form.tsx app/settings/page.tsx
git commit -m "Add settings page for profile name/avatar"
```

---

### Task 9: Entry detail dialog (shared by chart and calendar)

**Files:**
- Create: `components/entry-detail-dialog.tsx`

**Interfaces:**
- Consumes: shadcn `Dialog` primitives from `@/components/ui/dialog`; `MOOD_LABELS`, `MOOD_EMOJI` from `@/lib/mood`.
- Produces: `<EntryDetailDialog entry={MoodEntryDetail | null} onClose={() => void} />` — consumed by Task 10's chart and Task 11's calendar.

- [ ] **Step 1: Create `components/entry-detail-dialog.tsx`**

```tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MOOD_LABELS, MOOD_EMOJI } from "@/lib/mood";

export type MoodEntryDetail = {
  id: string;
  date: string; // ISO date string
  mood: number;
  sleepHours: number;
  feelings: string[];
  reflection: string | null;
};

export function EntryDetailDialog({
  entry,
  onClose,
}: {
  entry: MoodEntryDetail | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle>
                {new Date(entry.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                — {MOOD_EMOJI[entry.mood]} {MOOD_LABELS[entry.mood]}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">Slept {entry.sleepHours} hours</p>
              {entry.feelings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.feelings.map((f) => (
                    <Badge key={f} variant="secondary">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
              {entry.reflection && (
                <p className="text-sm text-muted-foreground">{entry.reflection}</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/entry-detail-dialog.tsx
git commit -m "Add shared entry detail dialog for chart and calendar"
```

---

### Task 10: Mood chart (last 11 entries)

**Files:**
- Create: `components/mood-chart.tsx`

**Interfaces:**
- Consumes: Recharts (`BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` from `"recharts"`); `EntryDetailDialog`, `MoodEntryDetail` from `@/components/entry-detail-dialog`; `MOOD_EMOJI` from `@/lib/mood`.
- Produces: `<MoodChart entries={MoodEntryDetail[]} />` — consumed by Task 12's history page. `entries` must already be sorted ascending by date and capped at 11 by the caller.

- [ ] **Step 1: Create `components/mood-chart.tsx`**

```tsx
"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  EntryDetailDialog,
  type MoodEntryDetail,
} from "@/components/entry-detail-dialog";
import { MOOD_EMOJI } from "@/lib/mood";

export function MoodChart({ entries }: { entries: MoodEntryDetail[] }) {
  const [selected, setSelected] = useState<MoodEntryDetail | null>(null);

  const data = entries.map((e) => ({
    ...e,
    label: new Date(e.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" fontSize={12} />
            <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} fontSize={12} />
            <Tooltip
              formatter={(value: number) => [`${MOOD_EMOJI[value]} (${value}/5)`, "Mood"]}
            />
            <Bar
              dataKey="mood"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(barData) => {
                const entry = entries.find((e) => e.id === barData.id);
                if (entry) setSelected(entry);
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill="var(--primary)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <EntryDetailDialog entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/mood-chart.tsx
git commit -m "Add mood chart for last 11 entries with click-to-detail"
```

---

### Task 11: Calendar view

**Files:**
- Create: `components/mood-calendar.tsx`

**Interfaces:**
- Consumes: `EntryDetailDialog`, `MoodEntryDetail` from `@/components/entry-detail-dialog`; `MOOD_EMOJI` from `@/lib/mood`.
- Produces: `<MoodCalendar entries={MoodEntryDetail[]} />` — consumed by Task 12's history page. `entries` may be any subset; the calendar renders the current month only for Phase 1 (no month navigation — YAGNI until there's more than one month of data to browse).

- [ ] **Step 1: Create `components/mood-calendar.tsx`**

```tsx
"use client";

import { useState } from "react";
import {
  EntryDetailDialog,
  type MoodEntryDetail,
} from "@/components/entry-detail-dialog";
import { MOOD_EMOJI } from "@/lib/mood";

export function MoodCalendar({ entries }: { entries: MoodEntryDetail[] }) {
  const [selected, setSelected] = useState<MoodEntryDetail | null>(null);

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();

  const entryByDay = new Map<number, MoodEntryDetail>();
  for (const entry of entries) {
    const d = new Date(entry.date);
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month) {
      entryByDay.set(d.getUTCDate(), entry);
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const entry = day ? entryByDay.get(day) : undefined;
          return (
            <button
              key={i}
              type="button"
              disabled={!day || !entry}
              onClick={() => entry && setSelected(entry)}
              className={`aspect-square rounded-md border text-sm ${
                day ? "border-border" : "border-transparent"
              } ${entry ? "cursor-pointer hover:bg-muted" : "cursor-default"}`}
            >
              {day && (
                <div className="flex h-full flex-col items-center justify-center gap-0.5">
                  <span className="text-xs text-muted-foreground">{day}</span>
                  {entry && <span>{MOOD_EMOJI[entry.mood]}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <EntryDetailDialog entry={selected} onClose={() => setSelected(null)} />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/mood-calendar.tsx
git commit -m "Add month-grid calendar view with mood emoji per logged day"
```

---

### Task 12: 5-vs-5 comparison card

**Files:**
- Create: `components/mood-comparison-card.tsx`

**Interfaces:**
- Consumes: shadcn `Card` primitives.
- Produces: `<MoodComparisonCard recent={{ avgMood: number; avgSleep: number } | null} previous={{ avgMood: number; avgSleep: number } | null} />` — consumed by Task 12's history page, which computes the averages server-side and passes `null` for both if fewer than 10 entries exist.

- [ ] **Step 1: Create `components/mood-comparison-card.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/mood-comparison-card.tsx
git commit -m "Add 5-vs-5 mood/sleep comparison card"
```

---

### Task 13: History page — wires chart, calendar, comparison together

**Files:**
- Create: `app/history/page.tsx`
- Create: `app/history/loading.tsx`

**Interfaces:**
- Consumes: `MoodChart` from `@/components/mood-chart`; `MoodCalendar` from `@/components/mood-calendar`; `MoodComparisonCard` from `@/components/mood-comparison-card`; `MoodEntryDetail` type from `@/components/entry-detail-dialog`; `getCurrentUser` from `@/lib/auth`; `prisma` from `@/lib/prisma`.
- Produces: `app/history/page.tsx` default export (server component, does the averaging math and passes plain-serializable data to client components).

- [ ] **Step 1: Create `app/history/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `app/history/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Succeeds with no errors.

- [ ] **Step 4: Verify in browser**

Open `http://localhost:<port>/history`.
Expected: Chart shows the 11 most recent seeded entries (bars clickable, opening detail dialog matching that day's data). Calendar shows current month with mood emoji on seeded days (if seed dates fall in the current month — if the 14 seeded days span a month boundary, some may not appear; that's expected for Phase 1, no month navigation yet). Comparison card shows real averages (14 seeded entries ≥ 10).

- [ ] **Step 5: Commit**

```bash
git add app/history/page.tsx app/history/loading.tsx
git commit -m "Add history page wiring chart, calendar, and comparison card"
```

---

### Task 14: End-to-end verification pass

**Files:** None created/modified — verification only.

**Interfaces:** N/A.

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean success, routes listed include `/`, `/history`, `/settings`.

- [ ] **Step 2: Fresh seed + browser walkthrough**

Run: `npm run db:seed` (resets to known state), then `npm run dev`.

In browser:
1. Visit `/` — mood entry form appears (no entry for today from seed).
2. Fill in mood, sleep hours, a couple of feelings, a reflection. Submit.
3. Expected: toast "Entry saved", page now shows today's summary with a quote matching the selected mood, sleep hours, feelings as badges, reflection text.
4. Click "Edit" — form reappears pre-filled with what was just saved.
5. Change the mood, resubmit.
6. Expected: toast "Entry saved" again, summary updates to the new mood/quote — confirms upsert (not a duplicate row) is working.
7. Visit `/history` — chart shows today's new entry as the most recent bar; click it, confirm the dialog matches what was just saved.
8. Visit `/settings`, change name, save, refresh the page, confirm the new name persisted in the input.

- [ ] **Step 3: Responsive check**

Resize browser (or devtools device toolbar) to 375px width on `/`, `/history`, `/settings`.
Expected: No horizontal overflow, mood emoji buttons and feeling chips wrap sensibly, chart and calendar remain legible.

- [ ] **Step 4: Update phase status**

Modify `docs/agents/PHASES-REFERENCE.md`: change Phase 1's status cell under "Mood tracker" from `Spec approved, implementation not started` to `Done`.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/PHASES-REFERENCE.md
git commit -m "Mark mood-tracker Phase 1 as done after end-to-end verification"
```
