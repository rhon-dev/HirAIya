# Architecture

System design and module boundaries for hirAIya. This project has two builds sharing one
repo, on separate branches:

- `main` — feedback/voting platform (Canny-style), phases 1-5 complete and deployed.
- `mood-tracker` — mood tracking app pivot (this branch), built per
  `docs/superpowers/specs/2026-07-15-mood-tracker-phase1-design.md`.

## Stack

- **Next.js 16 (App Router)** — server components by default, server actions for mutations
  (no separate REST/API layer for internal writes).
- **Prisma 7 + `@prisma/adapter-pg`** — driver-adapter mode, not the classic query engine
  binary. `datasource` block in `prisma/schema.prisma` has no `url` — the adapter gets
  `connectionString` directly from `process.env.DATABASE_URL` in `lib/prisma.ts`.
- **Neon Postgres** — serverless Postgres, pooled connection string
  (`...-pooler...neon.tech`).
- **shadcn/ui** — component primitives, added via `npx shadcn add <component>` as needed.
- **Zod + react-hook-form** — all form validation, both client and server-side (server
  actions re-validate, never trust client-only checks).
- **Recharts** — chart rendering (already a dependency; reused rather than adding
  Chart.js/D3).

## Module boundaries

```
app/                  → routes (App Router), page.tsx + server actions colocated per feature
  generated/prisma/    → generated Prisma client (gitignored, regenerated on build)
lib/
  prisma.ts            → singleton PrismaClient with pg adapter
  quotes.ts            → static mood-quote data (mood-tracker branch)
prisma/
  schema.prisma        → data model
  seed.ts              → dev/demo seed data
  migrations/           → (mood-tracker: schema pushed via `prisma db push`, no migration history yet)
```

## Auth pattern

No real authentication. A single demo `User` row is seeded and loaded implicitly — no
login screen, no session/JWT. On `main` this extended to a role field (`ADMIN`/`MEMBER`)
with a user-switcher for demoing gated features; on `mood-tracker` it's simpler still —
one user, no roles, since mood tracking is inherently single-user. This is a deliberate
scope reduction for a portfolio project, not a production auth strategy — documented so
it isn't mistaken for an oversight.

## Deployment

Vercel (hosting + build) + Neon (database). See `docs/deployment/README.md` for the
concrete steps and the specific incident that broke the first deploy.
