# Deployment

Vercel (build + hosting) + Neon (database), same as `main`.

## Steps

1. **Neon**: create project at neon.tech, copy the pooled connection string.
2. **Vercel**: import the GitHub repo as a project. Add env var `DATABASE_URL` (exact
   name — see incident below) under Settings → Environment Variables → Production.
3. **Schema + seed against Neon** (not local `.env`):
   ```bash
   export DATABASE_URL="<neon-connection-string>"
   npx prisma db push
   npm run db:seed
   ```
4. **Deploy**: push to the branch Vercel tracks, or `vercel deploy --prod` via CLI.
5. **Verify**: hit the live URL, check a couple of routes, and — if something 500s —
   pull real logs before guessing:
   ```bash
   vercel link --yes --project <project-name>   # first time only
   vercel logs <deployment-url>
   ```
   `vercel logs` shows the actual server-side error (e.g. Prisma error codes), which the
   browser only shows as a masked "digest" — don't try to debug production 500s from the
   browser console alone.

## Phase 3: reminder notification env vars

Web Push reminders need three env vars (local `.env` AND Vercel project settings):

| Var | How to get it |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` (public half) |
| `VAPID_PRIVATE_KEY` | same command (private half) |
| `CRON_SECRET` | any long random string, e.g. `openssl rand -hex 32` |

Generate the VAPID pair ONCE and reuse it everywhere — subscriptions are bound to the
public key, so rotating it invalidates every existing subscription.

The reminder check is triggered by an external cron service (Vercel Hobby crons are
daily-only): configure cron-job.org (free) to call
`GET https://<deployment>/api/reminders/run?secret=<CRON_SECRET>` every hour, at
minute 0. Non-200 responses count as failures in the cron dashboard.

## Incident log

**2026-07-15 — production 500 on every route.**

Two independent mistakes stacked:

1. The env var was added to the Vercel project under the wrong names (`hirAIya`,
   `hiraiya`) instead of `DATABASE_URL`. Code reads `process.env.DATABASE_URL` — typos
   in the var name fail silently at runtime (`undefined` connection string), not at
   build time. **Lesson: after adding an env var, `vercel env ls production` to confirm
   the exact name before redeploying.**
2. Local `.env` pointed at a local Postgres (`localhost:.../loopboard`), not Neon. Running
   `npm run db:seed` locally reported "Seeded 3 users..." successfully — but that seeded
   the *local* DB. The real Neon database had never had its schema pushed, so every query
   in production failed with `P2021: table does not exist`. **Lesson: "seed succeeded"
   only means something if you know which `DATABASE_URL` was active — check `.env` before
   trusting a green seed-script output as evidence production is populated.**

Fixed by: setting the correct env var name via `vercel env add DATABASE_URL production`,
then running `prisma db push` + `db:seed` with `DATABASE_URL` explicitly exported to the
Neon string, then `vercel deploy --prod`.

## Post-deploy checklist

- [ ] `vercel env ls production` shows exactly `DATABASE_URL`, no typo'd duplicates
- [ ] `npx prisma db push` run against the **Neon** URL, not local
- [ ] `npm run db:seed` run against the **Neon** URL, not local
- [ ] Hit `/`, and any role-gated routes (as the relevant role) in a browser or via
      WebFetch, not just "build succeeded"
- [ ] If anything 500s, `vercel logs` before guessing
