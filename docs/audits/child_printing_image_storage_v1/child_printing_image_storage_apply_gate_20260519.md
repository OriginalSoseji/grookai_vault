# CHILD_PRINTING_IMAGE_STORAGE_V1 Apply Gate

Date: 2026-05-19

## Decision

Status: BLOCKED_BEFORE_STRICT_GATE

The apply gate stopped during linked migration ledger preflight. The remote ledger contains unexpected remote-only migrations in addition to the expected local-only migration for this lane.

No migration was applied.

## Preflight Result

- Branch: `scanner-v4-card-present-gate`
- HEAD: `d00d2737`
- Latest lane commit present: yes
- Preflight command: `npm run preflight`
- Preflight result: `PASS_WITH_DEFERRED_DEBT`
- Diff whitespace check: passed

Known unrelated dirty files excluded from this gate:

- `.flutter-plugins-dependencies`
- `.gitignore`
- `backend/pricing/justtcg_domain_ingest_worker_v1.mjs`
- `docs/audits/pokemon_master_set_audit_v1/`
- `docs/ops/PRICING_HIGHWAY_REPAIR_PLAN_V1.md`
- `scripts/audits/pokemon_master_set_audit_v1.mjs`

## Migration Ledger Result

Expected local-only migration:

- `20260519163000_child_printing_image_storage_v1.sql`

Unexpected remote-only migrations:

- `20260518180000`
- `20260519151000`

Because the linked ledger is not clean, the gate stopped before:

- strict migration preflight
- remote read-only precheck
- Supabase dry-run
- Supabase apply

## Migration Audit

Migration inspected:

`supabase/migrations/20260519163000_child_printing_image_storage_v1.sql`

Findings:

- Adds only nullable image fields to `public.card_printings`.
- Adds comments documenting child-printing image semantics.
- Does not update parent `public.card_prints` image fields.
- Does not promote warehouse candidates.
- Does not copy images automatically.
- Does not modify pricing.
- Does not touch scanner code.
- Does not change Species Dex denominator logic.
- Does not enable public child routes.
- Updates warehouse action constraints to include `ENRICH_CARD_PRINTING_IMAGE`.
- Keeps existing warehouse actions valid:
  - `CREATE_CARD_PRINT`
  - `CREATE_CARD_PRINTING`
  - `ENRICH_CANON_IMAGE`
  - `BLOCKED_NO_PROMOTION`
  - `REVIEW_REQUIRED`

## Blocker

The migration ledger has remote-only migrations that are not present in this worktree. Applying the local migration from this state would risk operating from an incomplete local migration history.

## Required Next Action

Recover the local migration ledger before applying:

1. Identify what remote migrations `20260518180000` and `20260519151000` represent.
2. Restore their local migration files or switch to the branch/worktree that contains them.
3. Re-run:
   - `supabase migration list --linked`
   - `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260519163000`
4. Continue only if the only local-only migration is `20260519163000`.

## Safety Confirmation

- No DB write was performed.
- No migration was applied.
- No parent image overwrite occurred.
- No warehouse candidate was promoted.
- No pricing change was made.
- No scanner change was made.
- No Species Dex denominator change was made.
- No public child route was enabled.
