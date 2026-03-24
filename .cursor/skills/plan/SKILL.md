---
name: plan
description: Build a shared implementation plan before coding by eliciting requirements, proposing options, selecting one with the user, and producing implementation and test plans. Use when the user asks for planning, says /plan, or wants to scope a task before execution. Includes creating a feature branch and a GitHub issue documenting the final plan.
---

# Plan

Use this skill when the user wants a planning-first workflow (for example `/plan`) before implementation.

## Outcomes

Produce all of the following:

1. A shared understanding of the problem (validated with the user).
2. Multiple implementation options with trade-offs.
3. A user-selected option.
4. An implementation plan.
5. A test plan.
6. A new feature branch for the task.
7. A GitHub issue containing the plan and test plan.

## Non-negotiable rules

- Do not guess on unclear details; ask the user.
- Ask as many clarifying questions as needed to remove ambiguity.
- Do not start coding while in planning flow.
- Confirm option choice explicitly before finalizing the plan.
- Use concise, actionable steps.

## Workflow

### 1) Gather requirements first

Start by asking what needs to be done, then iterate until there is no critical ambiguity.

Minimum discovery checklist:

- Goal and expected outcome.
- Scope boundaries (in-scope / out-of-scope).
- Constraints (performance, security, compatibility, deadlines).
- Affected systems/files/components.
- Acceptance criteria.
- Risks and known edge cases.
- Preferred rollout strategy (if relevant).

If details are missing, keep asking focused follow-ups. Prefer grouped multiple-choice questions when possible.

### 2) Propose options

Present 2-4 viable approaches with trade-offs:

- Why each option works.
- Complexity and risk.
- Migration/backward-compatibility impact.
- Testing implications.

Then ask the user to choose one option explicitly.

### 3) Lock the selected option

After the user chooses:

- Restate the selected option in 2-4 bullets.
- Ask for confirmation if any open decision remains.
- Resolve any unknowns before planning.

### 4) Create implementation plan

Create a concrete plan with ordered steps:

- Preparation/setup steps.
- Core implementation steps.
- Validation and cleanup steps.
- Dependencies and sequencing notes.

Use checkboxes and keep steps independently verifiable.

### 5) Create test plan

Include:

- Unit/integration/e2e (as applicable).
- Positive and negative scenarios.
- Regression checks.
- Manual verification steps.
- Required tooling/commands.

### 6) Create and switch to a feature branch

Use git commands in this sequence:

```bash
git fetch origin
DEFAULT_BRANCH="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo main)"
git checkout "$DEFAULT_BRANCH"
git pull origin "$DEFAULT_BRANCH"
git checkout -b <feature-branch-name>
```

Branch naming guidance:

- `feat/<short-kebab-summary>` for features
- `fix/<short-kebab-summary>` for fixes
- `chore/<short-kebab-summary>` for maintenance

If the user has a branch naming convention, follow it.

### 7) Create GitHub issue and post plan

Create an issue with `gh` and include both implementation and test plans:

```bash
gh issue create --title "<task title>" --body "$(cat <<'EOF'
## Context
<problem statement + constraints>

## Selected approach
<chosen option and rationale>

## Implementation plan
- [ ] Step 1
- [ ] Step 2

## Test plan
- [ ] Test 1
- [ ] Test 2

## Acceptance criteria
- Criterion 1
- Criterion 2
EOF
)"
```

If the issue already exists, update it:

```bash
gh issue edit <issue-number> --body-file <path-to-prepared-body.md>
```

## Response format to user

Use this structure:

1. **Clarifying questions** (until ambiguity is removed).
2. **Options** (A/B/C with trade-offs).
3. **Selected option** (after user choice).
4. **Implementation plan** (checklist).
5. **Test plan** (checklist).
6. **Branch + issue status** (branch name, issue number/link).

## Completion checklist

- [ ] User goals and constraints are fully clarified.
- [ ] User selected an option explicitly.
- [ ] Implementation plan prepared.
- [ ] Test plan prepared.
- [ ] New feature branch created and checked out.
- [ ] GitHub issue created or updated with both plans.
