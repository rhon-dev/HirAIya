# Frontend

Next.js App Router, server components by default, client components only where
interactivity requires it (forms, chart click handlers, optimistic UI).

## Component conventions

- **shadcn/ui** primitives (`components/ui/`) — added on demand via
  `npx shadcn add <component>`, not pre-installed wholesale.
- **Forms**: react-hook-form + Zod resolver (`@hookform/resolvers`). Client-side
  validation for UX, server action re-validates the same schema — never trust the client
  check alone.
- **Optimistic UI**: used on `main` for voting (instant toggle, rollback on server
  rejection). Same pattern applies to mood-tracker's entry form if latency ever warrants
  it — not needed for Phase 1 given the low interaction frequency (once/day).
- **Loading states**: `loading.tsx` skeleton per route (board/detail on `main`); carry the
  same convention into mood-tracker's `/`, `/history`, `/settings`.

## Mood tracker pages (Phase 1)

| Route | Component | Notes |
|---|---|---|
| `/` | Entry form or Today summary | Conditional render based on whether today's entry exists |
| `/history` | Chart + calendar + comparison card | Recharts bar chart, custom month-grid calendar, both open the same detail popover |
| `/settings` | Profile form | Name + avatar, single demo user |

## Chart interaction

Recharts `Bar` `onClick` handler opens a detail popover (shadcn `Popover` or `Dialog`)
showing the full `MoodEntry` for that day — mood, sleep, feelings, reflection. Same
popover component is reused by the calendar view's day-click handler, so there is one
"entry detail" component, not two.

## Responsive baseline

Verified at 375px on `main` (mobile breakpoint) — carry the same baseline check into
mood-tracker screens before calling any page done.
