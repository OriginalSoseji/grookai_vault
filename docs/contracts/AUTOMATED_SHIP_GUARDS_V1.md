# AUTOMATED_SHIP_GUARDS_V1

Status: ACTIVE

## Purpose

Reduce founder memory burden around commit and push without changing runtime behavior, adding branch complexity, or delegating decisions to automation.

## Command Surface

- `npm run shipcheck`
  - runs the main local ship gate
- `npm run hooks:install`
  - installs the managed local Git hooks

## Hook Behavior

### Pre-commit

The managed `pre-commit` hook runs:

- `npm run shipcheck`

### Pre-push

The managed `pre-push` hook runs:

- `npm run shipcheck`
- dirty-worktree check

The dirty-worktree check allows:

- clean worktree
- only ` M .flutter-plugins-dependencies`

It blocks:

- any other modified file
- staged but uncommitted changes
- untracked files

## Human Authority

These guards automate checks, not decisions.

They do not:

- auto-fix code
- auto-commit
- auto-push
- mutate canon
- replace human review of deferred debt or risky changes

## Intentional Bypass

Hooks can be bypassed only intentionally with:

- `git commit --no-verify`
- `git push --no-verify`

That is an explicit operator choice, not normal flow.
