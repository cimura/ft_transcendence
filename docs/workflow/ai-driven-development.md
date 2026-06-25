# AI-driven development workflow

Last updated: 2026-06-25

This document defines how the team uses AI to keep development moving without spending too much time manually splitting and assigning tasks.

## Goal

Use AI as a project assistant that continuously turns the current requirements, schedule, issues, pull requests, and branch state into actionable quests.

AI should help with:

- splitting work into integration-sized quests
- keeping dependencies visible
- detecting stale or blocked work
- summarizing what changed after pushes and PR merges
- proposing scope cuts when the schedule is at risk

AI should not own:

- final scope decisions
- evaluation readiness decisions
- human assignment and accountability
- conflict resolution policy
- feature additions after scope freeze

## Sources of truth

Use these sources in this order:

| Priority | Source | Purpose |
|---|---|---|
| 1 | GitHub Wiki: `改訂版スケジュール（6.17）` | Current schedule and phase goals |
| 2 | GitHub Wiki: `要件` | Required modules and 14-point target |
| 3 | `docs/requirements.md` | Repo-local requirements snapshot |
| 4 | GitHub Issues | Quest-level work items |
| 5 | GitHub Pull Requests | Real implementation state |
| 6 | Branch diff against `origin/develop` | Evidence for what is actually implemented |
| 7 | CI status | Evidence for merge readiness |

If two sources disagree, prefer the higher-priority source and add a note to the quest board.

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

Ask AI to refresh the quest board from:

- GitHub Wiki schedule
- open issues
- open pull requests
- branch diffs against `origin/develop`
- CI status

Expected output:

- quests due today
- blocked quests
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

### After merge to `develop`

AI updates:

- quest status
- dependencies
- next recommended quest
- milestone risk

## GitHub Project fields

The current Project already has:

- `Status`
- `Iteration`
- `Start date`
- `Due date`

Recommended additional fields:

| Field | Type | Options |
|---|---|---|
| Module | Single select | Framework, WebSocket, User Interaction, Bomberman, Remote Players, User Management, Notifications, Stats, QA, Docs |
| Quest Type | Single select | Feature, Integration, Fix, QA, Docs, Decision |
| Risk | Single select | Low, Medium, High, Blocker |
| AI Status | Single select | Proposed, Confirmed, Needs Human Decision |
| Depends on | Text | Quest IDs, issues, or PRs |
| Acceptance | Text | One-line Done condition |

Do not add these fields until the team agrees, because Project fields affect everyone.

## Initial automation path

Start with local docs and templates:

1. Maintain `docs/quest-board.md`.
2. Use `.github/ISSUE_TEMPLATE/quest.yml` for new quest issues.
3. Use `.github/pull_request_template.md` for every PR.
4. Manually ask AI to refresh the quest board.

Then add GitHub integration:

1. Create GitHub labels and Project fields.
2. Convert confirmed quests into GitHub Issues.
3. Add issues to the Project.
4. Link PRs to quests.

Finally add automation:

1. Run a scheduled or manually triggered GitHub Action.
2. The action gathers Wiki, issues, PRs, and branch state.
3. AI proposes updates to `docs/quest-board.md`.
4. The action opens a PR with the proposed quest-board update.

## Scope policy

Until 2026-07-10, prioritize the required 14 points.

The second game and matchmaking bonus is out of scope unless all required modules are demonstrably complete.

If the schedule slips:

1. preserve Remote players and Bomberman first
2. reduce notification UI to a minimal list view
3. reduce chat to room-only
4. reduce stats to match history and simple ranking
5. postpone badges and nonessential UI polish

