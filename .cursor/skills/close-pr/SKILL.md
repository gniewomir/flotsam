---
name: close-pr
description: >-
    Verifies the current branch’s GitHub pull request is finished (merged or
    closed), then checks out the repo default branch and fast-forwards it from
    origin. Use when the user invokes /close-pr, says the PR is done, wants to
    return to main after merge, or sync default after closing a PR.
---

# Close PR — return to default branch and update

Run this **after** the associated PR is no longer open. If the PR is still **OPEN**, stop and tell the user; do not switch branches or pull until it is merged or closed.

## Preconditions

- `origin` points at GitHub; [GitHub CLI](https://cli.github.com/) (`gh`) is installed and authenticated (`gh auth status`).
- Working tree: if there are uncommitted changes, either **stash** (`git stash push -m "close-pr"`) or ask how to proceed before switching branches.

## 1. Context

```bash
git status
git branch --show-current
```

## 2. Is the PR finished?

For the **current branch**, resolve the PR:

```bash
gh pr view --json state,title,url,number 2>/dev/null
```

If that fails (no PR for this branch):

```bash
gh pr list --head "$(git branch --show-current)" --json state,title,url,number --limit 1
```

**Interpretation**

| Result                              | Action                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| No PR found                         | Tell the user there is no PR for this branch. Optionally offer to check out default and `git pull` anyway if they only wanted a clean default branch. |
| `state` is **OPEN**                 | **Stop.** Report title/URL and that the PR is not finished yet.                                                                                       |
| `state` is **MERGED** or **CLOSED** | Continue — PR is finished.                                                                                                                            |

## 3. Default branch name

```bash
git fetch origin
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo main
```

Use the resolved name (often `main` or `master`) below as `<default>`.

## 4. Check out default and update from remote

```bash
git checkout <default>
git pull --ff-only origin <default>
```

If `--ff-only` fails (local commits on default), report the situation; do not force-push or reset unless the user explicitly asks.

## 5. Optional local cleanup

After a **MERGED** PR, the feature branch may be deleted on GitHub. Locally:

```bash
git branch -d <old-feature-branch>   # safe delete if fully merged
```

Only if the user wants branch cleanup; skip if unsure.

## Checklist

- [ ] PR exists and state is **MERGED** or **CLOSED** (not **OPEN**)
- [ ] Clean stash or committed state before checkout
- [ ] On `<default>` after checkout
- [ ] `git pull --ff-only origin <default>` succeeded

## Edge cases

- **Already on default branch**: Skip checkout; still run `git fetch origin` and `git pull --ff-only origin <default>` if the user wanted to sync after a merge done elsewhere.
- **No `gh`**: Infer “finished” from the user or use the GitHub web UI; still run `git fetch`, checkout default, `git pull`.
