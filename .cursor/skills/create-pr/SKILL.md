---
name: create-pr
description: >-
    Creates a new GitHub pull request after syncing the base branch, creating a
    feature branch from it, and pushing with upstream tracking. Use when the
    user needs branch setup from main/master (or default) before opening a PR,
    or is on the default branch and needs a new named branch for review.
---

# Create pull request (with branch setup)

For changes that are **already on a feature branch or staged in a worktree** and only need commit → push → PR, use **create-pr-from-worktree** instead.

## Preconditions

- Repository has a Git remote (typically `origin`) pointing at GitHub.
- [GitHub CLI](https://cli.github.com/) (`gh`) is installed and authenticated (`gh auth status`).

If `gh` is missing, install it or use the host’s web UI after pushing; the branch and tracking steps still apply.

## Workflow

### 1. Sync base branch

```bash
git fetch origin
```

Identify the default branch (often `main` or `master`):

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo main
```

### 2. Create a feature branch from the default branch

```bash
git checkout main   # or master — use the repo default
git pull origin main
git checkout -b <branch-name>
```

Use a short, descriptive branch name (e.g. `fix-login-redirect`, `feat-export-csv`).

**Already on a non-default branch but it was branched from stale main?** Rebase or merge default first if the team expects an up-to-date base, then continue with commit/push below.

### 3. Commit and push with upstream tracking

```bash
git status
git add …
git commit -m "…"
git push -u origin HEAD
```

`-u` sets `branch.<name>.remote` and `branch.<name>.merge` so future `git push` / `git pull` work without extra arguments.

If the branch already exists on the remote but local has no upstream:

```bash
git branch -u origin/<branch-name>
```

### 4. Open the PR

```bash
gh pr create
```

Interactive prompts fill title and body. For a one-liner:

```bash
gh pr create --title "…" --body "…"
```

Draft PR:

```bash
gh pr create --draft
```

Link to an issue:

```bash
gh pr create --body "Closes #123"
```

### 5. Verify

```bash
gh pr view --web
```

## Edge cases

- **Uncommitted changes on the wrong branch**: Stash or commit, then create/switch branch; avoid mixing unrelated work on one PR.
- **Remote branch exists, local does not**: `git fetch origin && git checkout -b <name> origin/<name>` then continue.
- **Not GitHub**: Use the forge’s equivalent (e.g. GitLab `glab mr create`, or push and open the web UI manually).

## Checklist

- [ ] Base branch updated (`fetch` / `pull`)
- [ ] On a named feature branch with commits intended for this PR
- [ ] Pushed with `-u origin` (or equivalent upstream)
- [ ] PR created with `gh pr create` or web UI
