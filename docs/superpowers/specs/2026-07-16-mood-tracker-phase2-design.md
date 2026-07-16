# Mood Tracking App — Phase 2 (Data Export) Design

Continuation of the mood-tracker pivot on the `mood-tracker` branch. Phase 1 (core
tracker) is complete — see
`docs/superpowers/specs/2026-07-15-mood-tracker-phase1-design.md`. This spec covers
**Phase 2 only**: CSV/JSON export of a user's mood history.

## Scope

Export all logged entries for the single demo user, in both CSV and JSON, downloadable
from the settings page. No date-range filtering (YAGNI — add later if actually needed).

## Architecture

Two Next.js Route Handlers, no new dependencies:

```
app/export/csv/route.ts   -> GET, returns text/csv
app/export/json/route.ts  -> GET, returns application/json
```

Both handlers: fetch the current user via `getCurrentUser()` (existing single-user stub),
query all `MoodEntry` rows for that user ordered by `date` ascending, format, and return
with `Content-Disposition: attachment` so the browser downloads a real file from a plain
link — no client-side JS, no Blob/`URL.createObjectURL` machinery.

## Exported fields

| Field | CSV representation | JSON representation |
|---|---|---|
| `date` | `YYYY-MM-DD` string | ISO date string |
| `mood` | integer 1-5 | integer 1-5 |
| `moodLabel` | text (via `MOOD_LABELS`) | text (via `MOOD_LABELS`) |
| `sleepHours` | number | number |
| `feelings` | semicolon-joined string (e.g. `Anxious;Grateful`) | string array |
| `reflection` | string (may be empty) | string or `null` |

`moodLabel` is derived, not stored — included so the CSV is human-readable without a
lookup table. `mood` (the raw 1-5 integer) is also included for anyone who wants to
re-import or compute on it.

## CSV correctness

`reflection` and `feelings` can contain characters that break naive `,`-joining (commas,
quotes, newlines in reflection). Every field is passed through a proper CSV-quote helper:
wrap the field in double quotes and double any internal double quotes, per RFC 4180 —
not just when a comma happens to be present, since a newline or quote alone also requires
quoting.

## Empty state

Zero entries is not an error: CSV returns just the header row, JSON returns `[]`. Both
routes return `200`, never `404`/`500` for "no data yet."

## File naming

`mood-entries.csv` / `mood-entries.json` — no date-stamped filename (YAGNI; the user
downloads on demand, doesn't need to distinguish multiple exports by filename).

## UI

Two plain anchor tags on `/settings`, below the existing profile form:

```
<a href="/export/csv">Export as CSV</a>
<a href="/export/json">Export as JSON</a>
```

No new component needed — this is simple enough to inline directly in
`app/settings/page.tsx`.

## Out of scope for Phase 2

Date-range filtering, scheduled/automatic export, any format beyond CSV/JSON — all
deferred unless a later need arises. Phases 3-5 (notifications, weather correlation, ML
insights) are unrelated and untouched by this spec.
