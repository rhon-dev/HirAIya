# QA Push Gate

Checklist before `git commit` / `git push` — solo-project version, no separate QA role to
sign off, so this is the self-check that replaces one.

- [ ] `npm run build` passes (Prisma generate + TypeScript + Next build)
- [ ] Feature actually exercised in a browser (or WebFetch against a running deploy),
      not just "it compiles"
- [ ] If the change touches the database: confirmed which `DATABASE_URL` was active for
      any seed/push/migration step (see `docs/deployment/README.md#incident-log`)
- [ ] Responsive check at 375px for UI changes
- [ ] No secrets in the diff (`git diff` reviewed, not just `git add -A` blindly)
- [ ] `code-review` skill run on the diff for nontrivial changes
- [ ] Commit message explains *why*, not just *what* (the diff already shows what)
