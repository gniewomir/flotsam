---
name: create-pr-from-worktree
description: >-
    Opens a GitHub pull request from the current branch when work is already in
    place (e.g. git worktree checkout or existing feature branch): commit staged
    changes, push with upstream tracking, run gh pr create. Use when the user
    does not need to branch from main—only to land a PR from staged or ready
    commits in the current checkout.
---

# Create pull request from existing worktree / branch

Use this when the **branch already exists** (including a [git worktree](https://git-scm.com/docs/git-worktree) path) and the user mainly needs **commit → push → PR**. For **creating a new branch from `main`/`master`**, use **create-pr** instead.

## Preconditions

- Same as create-pr: `origin` on GitHub, `gh` installed and authenticated (`gh auth status`).

## Workflow

### 1. Confirm context

```bash
git status
git branch --show-current
pwd
```

- Should be on a **feature branch**, not the repo default (`main` / `master`), unless the team intentionally opens PRs from default (rare).
- In a linked worktree, `pwd` may differ from the primary clone; Git commands still run against that worktree’s branch.

### 2. Commit staged (or stage then commit)

```bash
git add …   # if not already staged
git commit -m "…"
```

If there is nothing to commit, ensure changes are staged or already committed before pushing.

### 3. Push with upstream tracking

```bash
git push -u origin HEAD
```

First push for this branch **must** use `-u` (or `git push -u origin <branch-name>`) so upstream is set.

If upstream already exists:

```bash
git push
```

If the remote branch exists but local has no upstream:

```bash
git branch -u origin/<branch-name>
git push
```

### 4. Open the PR

```bash
gh pr create
```

Or non-interactive:

```bash
gh pr create --title "…" --body "…"
```

Draft:

```bash
gh pr create --draft
```

### 5. Verify

```bash
gh pr view --web
```

## Edge cases

- **Wrong branch**: Create/switch branch before committing, or move commits (e.g. `cherry-pick`) so the PR scope stays correct.
- **Detached HEAD**: `git checkout -b <branch-name>` from current state, then commit and push.
- **PR already exists for this branch**: `gh pr view` or `gh pr list --head <branch-name>`; use `gh pr edit` if only metadata changes are needed.

## Checklist

- [ ] On the intended branch (worktree path is fine)
- [ ] Commits reflect the PR scope
- [ ] Pushed with upstream set (`-u` on first push)
- [ ] `gh pr create` (or follow-up on existing PR)
