# Agent Roster

There's no team of role-agents on this project — one developer, working with Claude Code
as the primary assistant. This lists the actual tools reached for, and when, so the
choice is deliberate rather than reflexive.

| Tool | Use for | Notes |
|---|---|---|
| **Claude Code (primary)** | Almost everything — reading code, editing, running builds, writing docs | Default; no need to delegate unless the task matches a row below |
| **Explore subagent** | Open-ended codebase search ("where is X defined", "map this directory") spanning more than ~3 lookups | Read-only, no code changes |
| **`code-review` skill** | Reviewing a diff before commit — correctness bugs + simplification opportunities | Effort level scales with how much confidence is needed |
| **`verify` skill** | Confirming a change actually works end-to-end (not just typechecks) | Drives the real app/flow, not just tests |
| **`brainstorming` skill** | Any new feature or project before code is written | Produces a design spec, gate before implementation |
| **`writing-plans` skill** | After a design spec is approved | Produces the step-by-step implementation plan |

## When to actually delegate vs. just do it

Delegate (spawn a subagent) when the task is genuinely open-ended research that would
otherwise burn a lot of back-and-forth in the main conversation. Don't delegate a task
whose target file/symbol is already known — that's a direct `Read`/`Edit`, not a subagent
call. Over-delegating a solo project just adds latency without adding judgment.
