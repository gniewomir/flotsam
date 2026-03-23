---
name: address-pr-feedback
description: >-
    Fetches pull request comments, reviews, and check status from GitHub and
    produces an ordered plan to address them. Use when the user wants to respond
    to PR feedback, apply review comments, or triage review threads before coding.
---

# Address PR feedback

## Preconditions

- GitHub remote and [GitHub CLI](https://cli.github.com/) (`gh`) authenticated for the repo.
- Know the PR number, or resolve it with `gh pr status` / `gh pr list`.

## 1. Collect feedback

Run from the repository root. Set `PR` to the pull request number.

```bash
PR=<number>
R=$(gh repo view --json nameWithOwner -q .nameWithOwner)
```

**Overview and conversation (good first pass):**

```bash
gh pr view "$PR" --comments
```

**Inline review comments (code threads):**

```bash
gh api "repos/${R}/pulls/${PR}/comments" --paginate
```

**Top-level issue comments on the PR (conversation tab):**

```bash
gh api "repos/${R}/issues/${PR}/comments" --paginate
```

**Review records (APPROVED / CHANGES_REQUESTED / COMMENTED + bodies):**

```bash
gh pr view "$PR" --json reviews --jq '.reviews[] | {author: .author.login, state: .state, body: .body}'
```

**CI / checks:**

```bash
gh pr checks "$PR"
```

**Single JSON snapshot (optional):**

```bash
gh pr view "$PR" --json title,body,reviewDecision,statusCheckRollup,reviews,comments
```

**Resolve PR number from the current branch:**

```bash
gh pr view --json number,title,url,state
```

## 2. Check out the PR branch locally

```bash
gh pr checkout "$PR"
```

Ensures you are on the contributor branch with tracking set when `gh` can set it.

## 3. Build the plan

Output a structured plan for the user (and follow it when implementing):

1. **List each feedback item** with source: inline comment / review summary / issue comment / failing check.
2. **Quote or paraphrase** the request; note file/path if the API or UI showed it.
3. **Order work**: failing checks and “must fix” review states first; then nits and suggestions.
4. **Mark duplicates** where one change satisfies multiple comments.
5. **Ask as many questions as needed**: Plan needs to be based on common understanding of what needs to be changed, how it needs to be hanged and how to test this the change. Leave no ambigiuity.
6. **Note unresolved threads**: after changes, reply or resolve on GitHub per team practice.

### Plan template

Use this in the reply:

```markdown
## PR #<n> — <title>

**Links:** <gh pr view URL>

### Checks

- [ ] (failing check) — what to fix

### Review feedback

1. **@reviewer / inline** — … — **Action:** …
2. …

### Optional / nit

- …

### After implementation

- [ ] Push branch; confirm `gh pr checks` pass
- [ ] Re-request review or comment with summary of changes
```

## 4. Implement and push

Work through the plan; keep commits scoped. After pushing:

```bash
gh pr checks "$PR"
```

## Edge cases

- **GitLab / other forges**: Use `glab` or the web API; the same plan structure applies.
- **Large comment dumps**: Prefer `--jq` filters on JSON to group by file or author.
- **Outdated comments**: Diff may have moved lines; map comments to current files with `git diff` / IDE.

## Checklist

- [ ] PR identified; conversation and inline comments gathered
- [ ] Checks recorded
- [ ] Branch checked out with `gh pr checkout`
- [ ] Plan delivered (or executed) in priority order
- [ ] Pushed; checks re-verified
