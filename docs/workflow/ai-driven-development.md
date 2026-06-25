# AI-driven development workflow

Last updated: 2026-06-26

This document defines how the team uses GitHub Projects and AI to keep development moving without spending too much time manually splitting, sorting, and re-sorting tasks.

## Goal

Use GitHub Projects as the main execution board, and use AI as a project assistant that keeps quests easy to pick up.

AI should help with:

- splitting work into integration-sized quests
- keeping dependencies visible
- detecting stale or blocked work
- summarizing what changed after pushes and PR merges
- proposing scope cuts when the schedule is at risk
- keeping `Priority`, `Next Action`, `Risk`, and dependencies easy to scan

AI should not own:

- final scope decisions
- evaluation readiness decisions
- human assignment and accountability
- conflict resolution policy
- feature additions after scope freeze
- final Done decisions

## Sources of truth

Use these sources in this order:

| Priority | Source | Purpose |
|---|---|---|
| 1 | GitHub Wiki: `改訂版スケジュール（6.17）` | Current schedule and phase goals |
| 2 | GitHub Wiki: `要件` | Required modules and 14-point target |
| 3 | GitHub Project: `トラセンプロジェクト` | Current quest status, priority, and next action |
| 4 | GitHub Issues | Confirmed quest details, discussion, and PR links |
| 5 | GitHub Pull Requests | Real implementation state |
| 6 | Branch diff against `origin/develop` | Evidence for what is actually implemented |
| 7 | CI status | Evidence for merge readiness |
| 8 | `docs/requirements.md` | Repo-local requirements snapshot |

If two sources disagree, prefer the higher-priority source and add a note to the relevant Project card or issue.

## Main board

The main working surface is the GitHub Project `トラセンプロジェクト`.

Members should normally start from the Project views, not from a Markdown checklist.

Recommended views:

| View | Purpose |
|---|---|
| Priority Queue | Group by `優先度`; this is the daily entry point |
| Next Actions | Group by `次のアクション` so people can pick review, implementation, integration, or test work |
| Blockers | Show `リスク = High` or `Blocker` |
| This Week | Show quests due this week |
| Schedule | Sort by due date |

Recommended Project fields:

| Field | Meaning |
|---|---|
| `優先度` | `P0 今すぐ`, `P1 次にやる`, `P2 近いうち`, `P3 後で` |
| `次のアクション` | Review, merge, decision, implementation, integration, test, docs, stabilization, or wait |
| `リスク` | Schedule or integration risk |
| `AIステータス` | Whether the quest is still AI-proposed or team-confirmed |
| `依存関係` | Quest IDs, issues, PRs, or decisions that must happen first |
| `完了条件` | One-line observable Done condition |

## Quest size

A quest should usually be completable by one developer in 0.5 to 2 days and should be mergeable as one coherent PR.

Good quest examples:

- "Connect the game screen to server `game:state` events"
- "Resolve lobby WebSocket conflict and merge into `develop`"
- "Expose match history API and connect profile UI"

Bad quest examples:

- "Finish WebSocket"
- "Fix all frontend bugs"
- "Implement notification button color"

## Quest schema

Every quest should include:

| Field | Meaning |
|---|---|
| Quest ID | Stable local identifier, for example `Q-003` |
| Title | Outcome-oriented task name |
| Phase | Schedule phase from the 2026-06-17 plan |
| Module | Requirement module, for example `Remote players` |
| Due | Target date |
| Owner | Human owner, or `Unassigned` |
| Status | `Proposed`, `Confirmed`, `In Progress`, `Review`, `Done`, `Blocked`, or `Cut` |
| Priority | `P0`, `P1`, `P2`, or `P3` |
| Next Action | The kind of work needed next |
| Depends on | Quest IDs, PRs, or issues that must land first |
| Do | Scope that belongs in the quest |
| Do not | Explicit exclusions |
| Acceptance | Observable completion criteria |
| Verification | Commands, manual checks, or CI required before Done |
| Risk | `Low`, `Medium`, `High`, or `Blocker` |

## Status rules

| Status | Rule |
|---|---|
| Proposed | AI generated it, but the team has not accepted it yet |
| Confirmed | The team agrees this quest should be done |
| In Progress | Someone is actively implementing it |
| Review | PR is open and ready for review |
| Done | Merged to `develop` and acceptance criteria are satisfied |
| Blocked | Cannot proceed without another quest, decision, or conflict resolution |
| Cut | Intentionally removed from current scope |

Only merged work on `develop` counts as Done.

## Operating cadence

### Daily start

Open the GitHub Project and start with:

- `優先度 = P0 今すぐ`
- `優先度 = P1 次にやる`
- `次のアクション`
- `リスク = High` or `Blocker`

AI should periodically refresh:

- priorities
- next actions
- stale or blocked cards
- PRs that should be reviewed or merged first
- scope risks against the next milestone

### Before opening a PR

The developer links the PR to one quest and fills in:

- related quest
- scope
- out of scope
- verification
- risks

### After push or PR update

AI checks:

- whether the PR still matches the quest scope
- whether the quest acceptance criteria changed
- whether another quest is now unblocked
- whether new conflicts appeared
- whether Project `Priority`, `Next Action`, or `Risk` should change

### After merge to `develop`

AI updates:

- quest status
- dependencies
- next recommended quest
- milestone risk
- a lightweight snapshot if the team wants an audit trail

## Repo templates

The repo keeps only lightweight templates and operating rules:

- `.github/ISSUE_TEMPLATE/quest.yml`
- `.github/pull_request_template.md`
- `docs/workflow/ai-driven-development.md`

The Project is the source of current quest state. Avoid maintaining a separate Markdown quest board as the main workflow because it becomes stale and duplicates the Project.

## Automation path

Start with Project-first automation:

1. Keep proposed quests as Project draft cards until the team confirms them.
2. Convert confirmed quests into GitHub Issues only when discussion, assignment, or PR linking is needed.
3. Require PRs to mention `Quest: Q-xxx` or `Closes #issue`.
4. Add a manually triggered GitHub Action that refreshes Project fields from issues, PRs, and CI.
5. Add a daily scheduled refresh if the manual flow is useful.
6. Let AI update low-risk fields such as `Risk`, `Priority`, `Next Action`, and dependency notes.
7. Keep deletion, major due-date changes, scope cuts, and final Done decisions human-controlled.

The optional Markdown snapshot can be generated later if the team wants a daily audit log, but it is not the main operating board.

## Scope policy

Until 2026-07-10, prioritize the required 14 points.

The second game and matchmaking bonus is out of scope unless all required modules are demonstrably complete.

If the schedule slips:

1. preserve Remote players and Bomberman first
2. reduce notification UI to a minimal list view
3. reduce chat to room-only
4. reduce stats to match history and simple ranking
5. postpone badges and nonessential UI polish
