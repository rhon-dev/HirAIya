# HirAIya

A public product-feedback board: submit feature requests, upvote and discuss others', and track every item as it moves across the roadmap — in the spirit of Canny / Frill / Upvoty.

**Live demo:** _coming soon_

![Board screenshot placeholder](docs/screenshot.png)

## Features

- **Feedback CRUD** — create, edit, delete with Zod-validated forms (shared client + server schema)
- **Voting** — one vote per user per item, optimistic UI with automatic rollback, transaction-safe server action
- **Threaded comments** — replies via a `parentId` adjacency list, recursive rendering with indent capped at 4 levels
- **Sorting & filtering** — most/least upvotes, most/least comments, newest; filter by category and status
- **Roles & permissions** — `ADMIN` / `MEMBER`; only admins change status or moderate others' content
- **Status workflow** — every transition writes an audit `StatusChange` record in the same transaction
- **Roadmap** — read-only 4-column kanban grouped by status
- **Admin dashboard** — role-gated stats, category bar chart (recharts), recent status changes

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, Server Actions), TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (Neon) |
| ORM | Prisma (driver adapter: `@prisma/adapter-pg`) |
| Validation | Zod — one schema for client form + server action |
| State | React `useOptimistic` for instant vote feedback |
| Deployment | Vercel + Neon |

No separate REST API: mutations are Next.js Server Actions colocated in `app/*/actions.ts`. Building a redundant API layer for a same-origin app would only add surface area.

## Concurrency handling

The interesting bit. Two users (or two tabs) spam-clicking the same vote button must never produce a duplicate vote. Defense in two layers:

```ts
// app/votes/actions.ts
await prisma.$transaction(async (tx) => {
  const existing = await tx.vote.findUnique({
    where: { userId_feedbackId: { userId: user.id, feedbackId } },
  });
  if (existing) throw new Error("ALREADY_VOTED");
  await tx.vote.create({ data: { userId: user.id, feedbackId } });
});
```

1. **Transaction** — the existence check and insert execute atomically, so a request can't observe a half-finished vote.
2. **Unique constraint backstop** — `@@unique([userId, feedbackId])` on the `Vote` model. If two requests race past the check simultaneously, Postgres rejects the second insert (`P2002`), which the action converts into a clean "already voted" error. The optimistic UI rolls the count back automatically.

The same pattern guards status changes: the `Feedback.status` update and its `StatusChange` audit record commit in one transaction, so the log can never drift from actual state.

## Auth note

Auth is intentionally stubbed: a header dropdown switches between seeded demo users (1 admin, 2 members) via a cookie. All permission checks run server-side against the selected user, so the role logic is real — only the login ceremony is skipped. Swapping in NextAuth means replacing one function (`getCurrentUser` in `lib/auth.ts`).

## Local development

```bash
npm install
npx prisma dev          # local Postgres (or set DATABASE_URL to your own)
# put the printed connection string in .env as DATABASE_URL
npx prisma db push
npm run db:seed
npm run dev
```

## Deployment

1. Create a Neon Postgres database, copy the connection string
2. Import the repo in Vercel, set `DATABASE_URL`
3. Build command already runs `prisma generate && next build`
4. Run `npx prisma db push && npm run db:seed` against the production DB once
