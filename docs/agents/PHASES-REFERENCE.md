# Phases Reference

## Feedback platform (`main`) — complete

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffolding: Next.js project, Prisma ORM, PostgreSQL, shadcn/ui, seed data | Done |
| 1 | Feedback CRUD, validation, demo-user auth | Done |
| 2 | Optimistic voting, transaction-safe vote action, sort/filter | Done |
| 3 | Feedback detail page, threaded comments | Done |
| 4 | Status workflow, roadmap kanban, admin dashboard | Done |
| 5 | Polish: loading skeletons, toast fixes, responsive check, README | Done |

Deployed to Vercel + Neon. See `docs/deployment/README.md` for the incident that broke
the first deploy and how it was fixed.

## Mood tracker (`mood-tracker`) — in progress

| Phase | Scope | Status |
|---|---|---|
| 0 | Pivot setup: branch created off `main`, scope decomposed into phases, Phase 1 design spec written + approved, `docs/` reference structure added | Done |
| 1 | Core: entry form, today's view, quotes, 11-entry chart, calendar, 5-vs-5 comparison, settings | Done |
| 2 | Data export (CSV/JSON) | Done |
| 3 | Scheduled reminder notifications | Not started |
| 4 | Weather API correlation | Not started |
| 5 | ML mood pattern insights | Not started |

Spec for Phase 1: `docs/superpowers/specs/2026-07-15-mood-tracker-phase1-design.md`.
Spec for Phase 2: `docs/superpowers/specs/2026-07-16-mood-tracker-phase2-design.md`.
Phases 3-5 each get their own spec when reached — see `docs/requirements/README.md` for
why they weren't all designed up front.
