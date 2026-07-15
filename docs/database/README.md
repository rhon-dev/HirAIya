# Database

Neon Postgres, accessed via Prisma 7 in driver-adapter mode (`@prisma/adapter-pg`).

## Connection

`DATABASE_URL` — pooled Neon connection string
(`postgresql://...@ep-...-pooler...neon.tech/neondb?sslmode=require&channel_binding=require`).

**Local dev:** `.env` currently points at a local Postgres instance
(`localhost:.../loopboard`), not Neon — this is intentional for local iteration, but means
`npm run db:seed` run locally seeds the *local* DB only. To push schema or seed data
against the real Neon database, override the env var for that one command:

```bash
export DATABASE_URL="<neon-connection-string>"
npx prisma db push       # sync schema
npm run db:seed          # seed data
```

This distinction caused a real production outage once (see
`docs/deployment/README.md#incident-log`) — worth re-reading before assuming "seed ran
successfully" means production has data.

## Schema

### Feedback platform (`main`)

`User` (with `Role` enum: `ADMIN`/`MEMBER`), `Feedback`, `Comment` (self-referential for
threading), `Vote` (unique constraint on `[userId, feedbackId]` as the concurrency
backstop behind the transaction), `StatusChangeLog` (audit trail).

### Mood tracker (`mood-tracker`)

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
  feelings    String[]
  reflection  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, date])
}
```

`@@unique([userId, date])` is the core invariant: one entry per user per calendar day.
It backs both the "editable until midnight" UX rule and the upsert logic in
`saveMoodEntry` — there is no separate create-vs-update branch in application code, the
constraint does the work.

## Migrations

Schema changes are applied with `prisma db push` (no migration history committed yet —
acceptable for a pre-launch portfolio project; would switch to `prisma migrate` if this
needed a real changelog across environments).
