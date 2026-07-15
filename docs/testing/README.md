# Testing

No automated test suite currently (portfolio-scale project) — verification is
build/typecheck + manual browser QA, driven by the `verify` skill after any nontrivial
change.

## What "done" means for a feature

1. `npm run build` succeeds (Prisma generate + TypeScript + Next build all pass).
2. Feature exercised end-to-end in a real browser (or via WebFetch for a quick production
   check) — not just "it typechecks."
3. For anything touching the database: confirm which `DATABASE_URL` is active before
   trusting a script's success output (see the incident in
   `docs/deployment/README.md#incident-log` — a successful seed against the wrong
   database looks identical to success in the terminal).
4. Responsive check at 375px for any UI change.

## Mood tracker specifics to verify per feature

- **Entry form**: submitting twice same day edits, not duplicates (relies on
  `@@unique([userId, date])` + upsert — verify the constraint actually fires, don't just
  trust the code review).
- **Chart**: click each of the 11 bars, confirm the detail popover matches that day's
  actual DB row.
- **Calendar**: a day with no entry renders distinctly from a day with one (no false
  emoji on empty days).
- **Comparison card**: with <10 total entries, confirm it shows "Not enough data yet"
  rather than an average over fewer than 5 entries per group (a silently wrong average
  is worse than an empty state).

## If a test suite gets added later

Prefer integration-style tests over heavy mocking for anything touching Prisma — the
feedback-platform build got burned by exactly this kind of gap once already (the
Neon/local `.env` mismatch), and mocked DB tests would not have caught it.
