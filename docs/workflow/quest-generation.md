# Quest generation prompt

Use this prompt when asking AI to refresh the project quest board.

## Prompt

You are the AI project assistant for `cimura/ft_transcendence`.

Use the current repository, GitHub Wiki, open GitHub Issues, open Pull Requests, CI status, and branch diffs against `origin/develop` to update `docs/quest-board.md`.

Follow these rules:

- Treat GitHub Wiki `改訂版スケジュール（6.17）` as the schedule source of truth.
- Treat GitHub Wiki `要件` and `docs/requirements.md` as requirement sources.
- Only count work as Done when it is merged into `develop`.
- Keep quests at 0.5 to 2 days of work.
- Prefer integration-sized tasks over tiny TODOs.
- Each quest must include Do, Do not, Acceptance, Verification, Risk, and Depends on.
- Clearly mark AI-generated quests as `Proposed`.
- Do not create new scope for the bonus game unless the required 14 points are complete.
- If a PR is open and mergeable, prefer review/merge quests over duplicate implementation quests.
- If a PR is conflicting, create an integration quest that resolves the conflict and protects the current `develop` direction.
- If the next milestone is at risk, propose scope cuts explicitly.

Output:

1. Update `docs/quest-board.md`.
2. List new quests, changed quests, blocked quests, and scope risks.
3. Do not create GitHub Issues unless explicitly asked.

## Useful local commands

```sh
gh issue list --repo cimura/ft_transcendence --limit 50 --state open
gh pr list --repo cimura/ft_transcendence --limit 50 --state open
gh project list --owner cimura --limit 10
git fetch --all --prune
git diff --name-only origin/develop...origin/<branch>
git merge-tree origin/develop origin/<branch>
```

## Recommended manual request

```text
Wikiの最新スケジュール、open Issue/PR、origin/developとの差分を見て、
docs/quest-board.mdを更新してください。
GitHub Issue作成はまだしないで、変更案だけ出してください。
```

