# DB Canon Complete Before Web Changes Restore Point V1

Date: 2026-06-16

Purpose:

This checkpoint preserves the current Grookai database canon, enrichment, image-truth, and website working state before new website changes begin.

Use this restore point if later website work needs to be abandoned or compared against the last known clean database/enrichment checkpoint.

## Git Restore Point

Branch at creation:

```text
codex/ios-beta-1.0.0-2-supabase-rpc-blocker
```

Commit:

```text
fb95dff503976450569dc059aa5c1efcd6f44440
```

Short commit:

```text
fb95dff5 chore: checkpoint canon enrichment before website changes
```

Tag:

```text
checkpoint/db-canon-complete-before-web-20260616
```

## What This Checkpoint Represents

This is the local restore point after the English physical canon, enrichment, image-truth cleanup, Pocket GV-ID lane, and external mapping alias governance work reached the current clean baseline.

Captured areas include:

- card row enrichment audit artifacts
- GV-ID and printing GV-ID completion work
- Pocket GV-ID namespace work
- external mapping alias sidecar governance
- post-reconcile duplicate and exception documentation
- image truth quality audit artifacts
- current card detail website files before the next website iteration

## Known State At Checkpoint

The commit hook ran the full shipcheck during checkpoint creation.

Observed result:

```text
preflight: PASS_WITH_DEFERRED_DEBT
critical failures: 0
web typecheck/lint/build: passed
Flutter analyze: passed
Flutter tests: passed
```

Known intentionally preserved facts:

- Remaining external mapping exceptions were documented, not silently ignored.
- `supabase/migrations/20260616161500_create_external_mapping_aliases_sidecar_v1.sql` exists in this checkpoint.
- No later website experiment should be treated as part of this checkpoint unless committed separately after this restore point.

## Safe Restore Options

Create a new branch from the checkpoint:

```powershell
git switch -c restore/db-canon-complete checkpoint/db-canon-complete-before-web-20260616
```

Inspect the checkpoint without switching:

```powershell
git show --stat checkpoint/db-canon-complete-before-web-20260616
```

Compare current work against the checkpoint:

```powershell
git diff checkpoint/db-canon-complete-before-web-20260616
```

Hard reset to the checkpoint only if intentionally discarding later local work:

```powershell
git reset --hard checkpoint/db-canon-complete-before-web-20260616
```

## Rule For Future Work

Website changes after this point should be committed separately from database canon or enrichment changes unless the scope explicitly says otherwise.
