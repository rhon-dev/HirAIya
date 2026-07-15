# Forms

Every form: react-hook-form + Zod schema, client validation mirrored by server-side
re-validation in the corresponding server action (see `docs/api/README.md`).

## Feedback platform (`main`)

| Form | Fields | Key validation |
|---|---|---|
| Feedback create/edit | title, description, category | title/description required, category enum |
| Comment | body (+ optional parent for replies) | body required, non-empty after trim |
| Status change | status (select) | enum, admin-role gated at the action layer, not just hidden in UI |

## Mood tracker (`mood-tracker`, Phase 1)

| Form | Fields | Key validation |
|---|---|---|
| Mood entry | mood (1-5), sleepHours (number), feelings (multi-select tags), reflection (optional textarea) | mood required, sleepHours 0-24, reflection optional with no length cap for Phase 1 |
| Profile settings | name, avatar | name required non-empty, avatar is a URL string field (no file upload in Phase 1) |

## Rule of thumb

If a validation rule exists only in the Zod schema and not restated in a comment or the
UI copy, that's fine — the schema is the source of truth. Don't duplicate constraints in
prose; link back to the schema file instead once it exists.
