# Requirements

## Mood tracker (current branch)

Source: [Frontend Mentor — Mood Tracking App](https://www.frontendmentor.io/challenges/mood-tracking-app-E2XeKhDF0B)

Full feature set was decomposed into 5 sequential phases rather than built all at once —
core CRUD, export, notifications, weather correlation, and ML insights are each
independent enough in scope/dependencies to warrant their own design spec and build pass.

| Phase | Scope | Spec |
|---|---|---|
| 1 | Core: daily entry, today's view, mood quotes, 11-entry chart, calendar, 5-vs-5 comparison, settings | `docs/superpowers/specs/2026-07-15-mood-tracker-phase1-design.md` |
| 2 | Data export (CSV/JSON) | Not yet written |
| 3 | Scheduled reminder notifications | Not yet written |
| 4 | Weather API correlation | Not yet written |
| 5 | ML mood pattern insights | Not yet written |

Each phase gets its own spec when reached — writing all 5 up front would mean designing
phases 2-5 against assumptions Phase 1's actual implementation might invalidate.

## Feedback platform (`main`, reference)

Requirements were tracked informally through 5 build phases (foundation → core features →
detail/comments → admin/roadmap → polish), not as a separate requirements doc — see
`README.md` on `main` for the shipped feature list and architecture rationale.
