# Grookai Execution Goals

The repository previously had a Markdown task queue but no selectable,
versioned goal registry. `registry.json` is the minimal extension of the
existing `.codex` project-control area.

List goals:

```powershell
node .codex/goals/load_goal.mjs --list
```

Load a complete specification:

```powershell
node .codex/goals/load_goal.mjs --id=mee-pricing-platform-production-v1
```

Specifications are hash-pinned. Changing a goal requires an intentional
registry hash update and contract-test review.
