# Quest board

Last generated: 2026-06-25

Status: AI-generated draft. Convert a quest from `Proposed` to `Confirmed` only after the team agrees.

## Sources

- GitHub Wiki: `改訂版スケジュール（6.17）`
- GitHub Wiki: `要件`
- Repo: `docs/requirements.md`
- GitHub Issues checked on 2026-06-25
- GitHub PRs checked on 2026-06-25

## Current schedule anchor

| Phase | Dates | Milestone | Current interpretation |
|---|---:|---|---|
| Phase 2 | 2026-06-24 to 2026-07-02 | Remote players match works | Active phase |
| Phase 3 | 2026-07-03 to 2026-07-10 | Required 14 points complete | Next phase |
| Phase 4 | 2026-07-11 to 2026-07-17 | Quality, Docker, README | Stabilization |
| Phase 5 | 2026-07-18 to 2026-07-22 | Release buffer | No new features |

## Open GitHub signals

| Item | State | AI note |
|---|---|---|
| PR #74 `feature/backend-lobby-websocket` | Open, conflicting | High-priority integration blocker |
| PR #75 `feature/settings-page` | Open, mergeable | Review and merge if it does not distract from Phase 2 |
| PR #76 `feature/match-history-api` | Open, mergeable | Useful for Phase 3 stats work |
| Issue #72 game screen backend API/WebSocket connection | Open | Main Remote players integration issue |
| Issue #62 NPC enhancement | Open | Defer unless required for MVP |
| Issue #38 Bomberman originality | Open | Defer until required modules are safe |

## Active quests

| ID | Title | Phase | Module | Due | Owner | Status | Risk | Depends on |
|---|---|---|---|---:|---|---|---|---|
| Q-001 | Resolve lobby WebSocket conflicts and land the room sync base | Phase 2 | WebSocket | 2026-06-26 | Unassigned | Proposed | High | PR #74 |
| Q-002 | Freeze game socket contract for server-authoritative Bomberman | Phase 2 | Remote Players | 2026-06-27 | Unassigned | Proposed | High | Q-001, Issue #72 |
| Q-003 | Implement backend game state broadcast MVP | Phase 2 | Bomberman | 2026-06-29 | Unassigned | Proposed | High | Q-002 |
| Q-004 | Replace frontend mock game API with remote socket adapter | Phase 2 | Remote Players | 2026-06-30 | Unassigned | Proposed | High | Q-002, Q-003 |
| Q-005 | Prove one remote match across two tabs or devices | Phase 2 | Remote Players | 2026-07-02 | Unassigned | Proposed | Blocker | Q-003, Q-004 |
| Q-006 | Review and merge match history API | Phase 3 | Stats | 2026-07-03 | Unassigned | Proposed | Medium | PR #76 |
| Q-007 | Connect match history UI and simple ranking | Phase 3 | Stats | 2026-07-05 | Unassigned | Proposed | Medium | Q-006, Q-005 |
| Q-008 | Connect room-only chat through API or socket | Phase 3 | User Interaction | 2026-07-06 | Unassigned | Proposed | Medium | Q-001 |
| Q-009 | Implement minimal notification list for friend requests and invites | Phase 3 | Notifications | 2026-07-08 | Unassigned | Proposed | Medium | Friends flow, room invite flow |
| Q-010 | Run 14-point acceptance pass and cut nonessential scope | Phase 3 | QA | 2026-07-10 | Unassigned | Proposed | High | Q-005, Q-007, Q-008, Q-009 |
| Q-011 | Stabilize Docker one-command startup and HTTPS verification | Phase 4 | QA | 2026-07-14 | Unassigned | Proposed | Medium | Q-010 |
| Q-012 | Finish README and final evaluation checklist | Phase 4 | Docs | 2026-07-17 | Unassigned | Proposed | Medium | Q-010 |

## Quest details

### Q-001 Resolve lobby WebSocket conflicts and land the room sync base

Do:

- Resolve PR #74 conflicts against `origin/develop`.
- Preserve the current `develop` auth, schema, and room API direction.
- Land the minimal room join, leave, ready, lobby update, and waiting room update behavior needed by Phase 2.

Do not:

- Redesign the full room model.
- Add unrelated game logic.
- Expand chat or notification scope.

Acceptance:

- PR #74 or an equivalent integration PR merges into `develop`.
- Lobby and waiting room state can be synchronized from backend state.
- Backend and frontend CI checks pass for touched areas.

Verification:

- `npm run lint` and `npm run format:check` in touched workspaces.
- Manual lobby and waiting room smoke test.

### Q-002 Freeze game socket contract for server-authoritative Bomberman

Do:

- Define client-to-server events for joining, leaving, input, and bomb placement.
- Define server-to-client events for init, state, bomb updates, game end, and errors.
- Confirm that user identity is resolved from authenticated socket state, not from client payload.

Do not:

- Implement every game rule in this quest.
- Add matchmaking.
- Add a second game.

Acceptance:

- Contract is documented in repo docs or shared types.
- Frontend and backend can implement against the same names and payload shapes.

Verification:

- TypeScript compile or shared type import check where applicable.
- Team confirms the contract before Q-003 and Q-004 continue.

### Q-003 Implement backend game state broadcast MVP

Do:

- Add the backend game gateway/service needed for a minimal Bomberman match.
- Keep the server authoritative for position, collision, bombs, death, and end state.
- Broadcast `game:state` at a stable cadence or after state changes.
- Handle disconnect as a forfeit or minimal leave case.

Do not:

- Add advanced power-ups.
- Add second-game abstraction.
- Persist full replay data.

Acceptance:

- Two authenticated clients can join the same game session.
- Server accepts input and broadcasts state.
- A match can end with a winner or forfeit.

Verification:

- Backend unit tests for game service logic where practical.
- Manual socket smoke test.

### Q-004 Replace frontend mock game API with remote socket adapter

Do:

- Add a remote game API or socket adapter for the game screen.
- Map server state into the existing `BombermanGameState` shape.
- Keep mock mode only if useful for local fallback, not as the main Phase 2 path.

Do not:

- Rewrite the entire canvas renderer.
- Change game art or theme.
- Implement unrelated settings UI.

Acceptance:

- Game screen sends input over the real socket path.
- Game screen renders server state.
- Leave, reconnect error, and game end are handled minimally.

Verification:

- Frontend lint, format, and build.
- Manual two-tab game screen test.

### Q-005 Prove one remote match across two tabs or devices

Do:

- Run one full match from room creation to game result.
- Test at least two tabs; use two devices if available.
- Record known limitations and remaining bugs.

Do not:

- Add new features during the proof pass.
- Tune UI polish unless it blocks playability.

Acceptance:

- The team can demo one real-time Bomberman match.
- Inputs from both players affect the shared server state.
- End state is visible to players.

Verification:

- Manual test notes in PR or quest comment.
- Chrome console checked for blocking errors.

### Q-006 Review and merge match history API

Do:

- Review PR #76 for schema, API shape, and frontend compatibility.
- Merge or request changes quickly.
- Keep the implementation aligned with the minimal stats needs for Phase 3.

Do not:

- Expand into badges unless Phase 3 is safe.
- Block Remote players work unless there is a schema conflict.

Acceptance:

- Match history API is merged into `develop`.
- The data model can store match outcomes from Q-005.

Verification:

- CI checks pass.
- Minimal API smoke test or service test passes.

### Q-007 Connect match history UI and simple ranking

Do:

- Connect profile or stats UI to real match history data.
- Add a simple ranking view if the API supports it.
- Keep the UI minimal and evaluation-focused.

Do not:

- Build a complex analytics dashboard.
- Add badges unless required work is otherwise complete.

Acceptance:

- User can see their match history.
- A simple ranking or win count view exists.

Verification:

- Frontend build.
- Manual profile/stats smoke test with seeded or real match data.

### Q-008 Connect room-only chat through API or socket

Do:

- Implement room-scoped chat only.
- Ensure messages are visible to current room participants.
- Keep profile link behavior if already available.

Do not:

- Add global chat.
- Add direct messages.
- Build moderation or block features.

Acceptance:

- Two users in the same room can exchange messages.
- Users outside the room do not receive those messages.

Verification:

- Manual two-user room chat test.
- Backend/frontend checks for touched code.

### Q-009 Implement minimal notification list for friend requests and invites

Do:

- Show friend request and game invite notifications in an in-app list.
- Persist unread notifications if the backend already supports it or can support it minimally.
- Keep delivery simple.

Do not:

- Add polished toast animations.
- Add email or browser push notifications.
- Add broad notification preferences.

Acceptance:

- User can see friend request and game invite notifications.
- User can mark or implicitly clear viewed notifications.

Verification:

- Manual notification flow test.
- API/service tests if backend logic is added.

### Q-010 Run 14-point acceptance pass and cut nonessential scope

Do:

- Check every required module against `docs/requirements.md`.
- Identify missing acceptance gaps.
- Cut bonus and nonessential work explicitly.

Do not:

- Start new features.
- Expand UI polish beyond evaluation blockers.

Acceptance:

- Required 14 points have an evidence-backed status.
- Remaining blockers are converted into fix quests.
- Bonus game remains out of scope unless all required work is done.

Verification:

- Manual checklist.
- CI status.
- Demo path smoke test.

### Q-011 Stabilize Docker one-command startup and HTTPS verification

Do:

- Confirm the expected one-command startup path.
- Fix startup issues that block a fresh environment.
- Verify HTTPS with the self-signed certificate path.

Do not:

- Change deployment architecture.
- Add external managed services.

Acceptance:

- A teammate can start the app from a fresh checkout using documented commands.
- HTTPS works for evaluation needs.

Verification:

- Fresh-start command log.
- Browser smoke test.

### Q-012 Finish README and final evaluation checklist

Do:

- Document stack, modules, point calculation, DB schema, setup, and AI usage.
- Add final demo and evaluation checklist.
- Keep README in English as required.

Do not:

- Move planning discussion into README.
- Add unverified claims.

Acceptance:

- README satisfies the mandatory requirements.
- Final checklist is actionable for the release buffer.

Verification:

- README review.
- Setup commands tested or clearly marked.

## Scope cuts already recommended

| Scope | Decision |
|---|---|
| Bonus second game | Cut until required 14 points are complete |
| Matchmaking | Cut with the bonus game |
| Global chat | Cut; room-only chat is enough |
| Direct messages | Cut |
| Notification toasts | Optional; list view is enough |
| Advanced Bomberman power-ups | Defer unless Remote players is safe |
| Badges | Defer if stats schedule slips |

## Next AI refresh checklist

- Has PR #74 been merged or replaced?
- Has the game socket contract been documented?
- Is Issue #72 still too broad and should it be split?
- Is PR #76 merged before stats UI work starts?
- Are any quests past due?
- Does the active phase still match the Wiki schedule?

