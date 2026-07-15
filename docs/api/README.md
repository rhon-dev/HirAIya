# API

hirAIya has no separate REST/GraphQL API — all mutations go through Next.js **server
actions**, colocated with the feature that owns them. This doc inventories them by domain
so the surface area is visible in one place without grepping the whole app tree.

## Convention

Every server action follows the same shape (established on `main`, reused on
`mood-tracker`):

1. Parse/validate input with a Zod schema.
2. Run the mutation via `prisma` (transaction if it touches >1 table).
3. `revalidatePath(...)` on success so the UI reflects the change without a client refetch.
4. Return a typed result (`{ success: true, data }` or `{ success: false, error }`) —
   never throw across the server/client boundary; the client shows `error` inline.

## Feedback platform (`main`)

| Action | File | Domain |
|---|---|---|
| `createFeedback` / `updateFeedback` | `app/feedback/actions.ts` | Feedback CRUD |
| `voteFeedback` | `app/votes/actions.ts` | Voting (transaction-safe, unique-constraint backstop) |
| `createComment` / `deleteComment` | `app/feedback/[id]/comments/actions.ts` | Threaded comments |
| `changeFeedbackStatus` | `app/admin/actions.ts` | Status workflow + audit log (atomic) |

## Mood tracker (`mood-tracker`)

Per the Phase 1 design spec:

| Action | Purpose | Notes |
|---|---|---|
| `saveMoodEntry` | Upsert on `[userId, date]` | Same action handles create (no entry today) and edit (entry exists today) |
| `updateUserProfile` | Update name/avatar | Single demo user, no auth check needed |

Later phases will add: export action (Phase 2), notification-scheduling config (Phase 3),
weather-correlation fetch (Phase 4), pattern-insight computation (Phase 5) — each gets
its own row here when built, not speculatively now.
