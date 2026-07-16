# Mood Tracker Phase 2 (Data Export) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Downloadable CSV and JSON exports of all mood entries, linked from the settings page.

**Architecture:** A pure formatting module (`lib/export.ts`) shared by two GET Route Handlers (`app/export/csv/route.ts`, `app/export/json/route.ts`) that fetch all entries for the single demo user and return them with `Content-Disposition: attachment`. Two plain anchor tags on `/settings` trigger the downloads — no client JS.

**Tech Stack:** Next.js 16 App Router Route Handlers (Web `Response` API), Prisma (`@/lib/prisma`), existing `getCurrentUser()` stub. **No new dependencies.**

**Spec:** `docs/superpowers/specs/2026-07-16-mood-tracker-phase2-design.md` — binding requirements below are copied from it.

## Global Constraints

- No new npm dependencies. CSV is built by hand.
- **RFC 4180 quoting, applied to EVERY field unconditionally**: wrap the field in double quotes and double any internal double quotes. Not comma-triggered — a newline or quote alone also requires quoting.
- Exported fields, in this exact order: `date` (YYYY-MM-DD), `mood` (int 1-5), `moodLabel` (via `MOOD_LABELS` from `@/lib/mood`), `sleepHours`, `feelings` (semicolon-joined in CSV; string array in JSON), `reflection` (empty string in CSV when null; `null` in JSON).
- Entries ordered by `date` ascending.
- Filenames: exactly `mood-entries.csv` / `mood-entries.json` (no date stamp).
- Empty history returns `200` with a valid empty file: CSV = header row only, JSON = `[]`. Never 404/500 for "no data yet."
- No date-range filtering, no other formats, nothing from Phases 3-5.
- Project has NO automated test framework by design (`docs/testing/README.md`) — verification is `npm run build` + scratch scripts + curl against the dev server. Scratch scripts live outside the repo and must not be committed.
- This is NOT the Next.js you know (see `AGENTS.md`): consult `node_modules/next/dist/docs/` if any Next API looks unfamiliar. Route Handlers use the standard Web `Response` API.

---

### Task 1: Export formatting module

**Files:**
- Create: `lib/export.ts`

**Interfaces:**
- Consumes: `MOOD_LABELS` from `@/lib/mood`; `MoodEntry` type from `@/app/generated/prisma/client` (fields: `date: Date`, `mood: number`, `sleepHours: number`, `feelings: string[]`, `reflection: string | null`).
- Produces (Task 2 relies on these exact names/signatures):
  - `toExportRow(entry: MoodEntry): ExportRow`
  - `entriesToCsv(entries: MoodEntry[]): string`
  - `type ExportRow = { date: string; mood: number; moodLabel: string; sleepHours: number; feelings: string[]; reflection: string | null }`

- [ ] **Step 1: Write `lib/export.ts`**

```ts
import { MOOD_LABELS } from "@/lib/mood";
import type { MoodEntry } from "@/app/generated/prisma/client";

export type ExportRow = {
  date: string; // YYYY-MM-DD (entries are stored at midnight UTC)
  mood: number;
  moodLabel: string;
  sleepHours: number;
  feelings: string[];
  reflection: string | null;
};

export function toExportRow(entry: MoodEntry): ExportRow {
  return {
    date: entry.date.toISOString().slice(0, 10),
    mood: entry.mood,
    moodLabel: MOOD_LABELS[entry.mood] ?? String(entry.mood),
    sleepHours: entry.sleepHours,
    feelings: entry.feelings,
    reflection: entry.reflection,
  };
}

// RFC 4180: every field is quoted unconditionally; internal quotes are doubled.
// Unconditional quoting is always valid CSV and avoids a "does this field need
// quoting" branch that's easy to get subtly wrong (newlines, quotes, commas).
export function csvEscape(field: string): string {
  return `"${field.replace(/"/g, '""')}"`;
}

const CSV_HEADER = ["date", "mood", "moodLabel", "sleepHours", "feelings", "reflection"];

export function entriesToCsv(entries: MoodEntry[]): string {
  const lines = [CSV_HEADER.map(csvEscape).join(",")];
  for (const entry of entries) {
    const row = toExportRow(entry);
    lines.push(
      [
        row.date,
        String(row.mood),
        row.moodLabel,
        String(row.sleepHours),
        row.feelings.join(";"),
        row.reflection ?? "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\r\n") + "\r\n";
}
```

- [ ] **Step 2: Verify with a scratch script (do NOT commit it)**

Write to the scratchpad directory (outside the repo), e.g. `verify-export.ts`:

```ts
import { entriesToCsv, toExportRow } from "../../lib/export"; // adjust relative path, or copy lib/export.ts logic inline if path mapping fails — simplest: run from repo root with tsx and a tsconfig-paths-free relative import "./lib/export"
import type { MoodEntry } from "../../app/generated/prisma/client";

const base = {
  id: "x",
  userId: "u",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const entries = [
  {
    ...base,
    date: new Date(Date.UTC(2026, 6, 15)),
    mood: 4,
    sleepHours: 7.5,
    feelings: ["Grateful", "Calm"],
    reflection: 'Said "hi", then\nnew line, comma',
  },
  {
    ...base,
    date: new Date(Date.UTC(2026, 6, 16)),
    mood: 2,
    sleepHours: 6,
    feelings: [],
    reflection: null,
  },
] as MoodEntry[];

const csv = entriesToCsv(entries);
console.log(csv);

// Assertions
const ok = (cond: boolean, msg: string) => {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("OK: " + msg);
};
ok(csv.startsWith('"date","mood","moodLabel","sleepHours","feelings","reflection"\r\n'), "header row, all fields quoted");
ok(csv.includes('"2026-07-15","4","Happy","7.5","Grateful;Calm"'), "row 1 values, feelings semicolon-joined");
ok(csv.includes('"Said ""hi"", then\nnew line, comma"'), "internal quotes doubled, newline+comma survive inside quotes");
ok(csv.includes('"2026-07-16","2","Sad","6","",""'), "empty feelings and null reflection become empty quoted fields");
ok(entriesToCsv([]) === '"date","mood","moodLabel","sleepHours","feelings","reflection"\r\n', "empty input = header only");
ok(toExportRow(entries[1]).reflection === null, "JSON row keeps null reflection");
ok(JSON.stringify(toExportRow(entries[0]).feelings) === '["Grateful","Calm"]', "JSON row keeps feelings as array");
console.log("ALL OK");
```

Run from repo root: `npx tsx <scratchpad-path>/verify-export.ts`
Expected: prints the CSV, then `OK:` lines, ending `ALL OK`. If the `@/` alias breaks under tsx, use a relative import (`./lib/export`) and run from the repo root — do not add tooling to fix aliases for a scratch script.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add lib/export.ts
git commit -m "Add export formatting module with RFC 4180 CSV quoting"
```

---

### Task 2: CSV and JSON Route Handlers

**Files:**
- Create: `app/export/csv/route.ts`
- Create: `app/export/json/route.ts`

**Interfaces:**
- Consumes: `getCurrentUser()` from `@/lib/auth` (returns the single seeded `User`, throws if none); `prisma` from `@/lib/prisma`; `entriesToCsv` / `toExportRow` from `@/lib/export` (Task 1).
- Produces: `GET /export/csv` and `GET /export/json` endpoints (Task 3's links point here).

- [ ] **Step 1: Write `app/export/csv/route.ts`**

```ts
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entriesToCsv } from "@/lib/export";

// Exports must reflect the live DB on every request, never a build-time snapshot.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const entries = await prisma.moodEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });
  return new Response(entriesToCsv(entries), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mood-entries.csv"',
    },
  });
}
```

- [ ] **Step 2: Write `app/export/json/route.ts`**

```ts
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toExportRow } from "@/lib/export";

// Exports must reflect the live DB on every request, never a build-time snapshot.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const entries = await prisma.moodEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });
  return new Response(JSON.stringify(entries.map(toExportRow), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="mood-entries.json"',
    },
  });
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success; route list includes `ƒ /export/csv` and `ƒ /export/json` (dynamic).

- [ ] **Step 4: Verify against dev server**

Start `npm run dev` (note the port), then:

```bash
curl -sD - http://localhost:3000/export/csv -o <scratchpad>/mood-entries.csv
curl -sD - http://localhost:3000/export/json -o <scratchpad>/mood-entries.json
```

Expected headers on both: `200`, correct `Content-Type`, `Content-Disposition: attachment; filename="mood-entries.csv"` (resp. `.json`).
Expected bodies: CSV has header row + one row per seeded entry (14 unless the DB changed), dates ascending, every field double-quoted. JSON parses (`node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).length)' <file>`) and each element has keys `date, mood, moodLabel, sleepHours, feelings, reflection` with `feelings` an array.
Stop the dev server afterwards. Downloaded files go in the scratchpad, not the repo.

- [ ] **Step 5: Commit**

```bash
git add app/export/csv/route.ts app/export/json/route.ts
git commit -m "Add CSV and JSON export route handlers"
```

---

### Task 3: Export links on settings page + end-to-end check

**Files:**
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Consumes: the `/export/csv` and `/export/json` endpoints from Task 2.
- Produces: user-visible export UI. Nothing downstream depends on this.

- [ ] **Step 1: Add the export section**

Current file renders `<h1>` + `<ProfileForm>` inside `div.mx-auto.max-w-xl.space-y-6`. Add a section AFTER the `ProfileForm`:

```tsx
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
```

Plain `<a>` tags on purpose (not `next/link`): these hit Route Handlers that return `Content-Disposition: attachment`, so they must be full navigations, not client-side transitions. Do not create a new component — inline per spec.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Verify rendered page**

Start `npm run dev`, then:

```bash
curl -s http://localhost:3000/settings | grep -o 'href="/export/[a-z]*"'
```

Expected: `href="/export/csv"` and `href="/export/json"` both present. Stop the dev server.

- [ ] **Step 4: Update phases reference**

In `docs/agents/PHASES-REFERENCE.md`, mood tracker table: Phase 2 status `Not started` → `Done`. Add below the table, next to the Phase 1 spec line: `Spec for Phase 2: docs/superpowers/specs/2026-07-16-mood-tracker-phase2-design.md.`

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx docs/agents/PHASES-REFERENCE.md
git commit -m "Add export links to settings page, mark Phase 2 done"
```
