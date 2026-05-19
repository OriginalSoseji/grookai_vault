# Child Printing Public Identity V1 Apply Gate

Generated: 2026-05-18

Status: APPLIED AND VERIFIED.

## Root Cause Fixed

The previous blocker mixed two different guard modes:

- `AuditLinkedSchema` is an empty-diff guard for situations with no expected local-only migration.
- This branch intentionally had one local-only migration: `20260518180000_child_printing_public_identity_v1.sql`.

The correct strict gate for this lane is:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260518180000
```

That gate verifies the linked ledger, expected pending migration set, duplicate pending objects, and local replay.

## Link Recovery

- project ref discovered: `ycdxbpibncqcchqiihfz`
- project ref source: `supabase/config.toml`
- linked status: PASS

## Linked Migration Ledger Before Apply

Command:

```powershell
supabase migration list --linked
```

Result: PASS.

Before apply, the only local-only migration visible at the tail of the ledger was:

```text
20260518180000_child_printing_public_identity_v1.sql
```

## Shadow Port Recovery

The stale shadow container on `54331` was removed after inspection. Additional auto-remove shadow containers created by later diff attempts were stopped only after confirming they were Supabase shadow Postgres containers for project `ycdxbpibncqcchqiihfz`.

The normal local Supabase DB container on `54330` was preserved.

## Strict Migration Preflight

Command:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260518180000
```

Result: PASS.

Verified:

- linked ledger readable
- actual local-only migration set matched expected
- pending migration object scan passed
- local replay completed successfully through `supabase db reset --local --yes`

## Live Candidate Regeneration

Command:

```powershell
node scripts/audits/child_printing_public_identity_v1.mjs
```

Result: PASS.

Fresh regenerated counts:

- total child printings: `55,582`
- approved candidates: `44,698`
- blocked parent missing gv_id: `10,377`
- blocked parent variant boundary: `507`
- proposed collisions: `0`
- unsupported finish keys: `0`

Drift from committed expected counts: `0`.

## Remote Read-Only Precheck

Result: PASS.

Verified before apply:

- `card_printings.printing_gv_id` absent
- `card_printings` count: `55,582`
- missing parent `gv_id` count: `10,377`
- proposed collision count from regenerated audit: `0`
- unsupported finish keys: `0`

## Dry Run

Command:

```powershell
supabase db push --dry-run
```

Result: PASS.

The dry run proposed exactly one migration:

```text
20260518180000_child_printing_public_identity_v1.sql
```

## Apply

Command:

```powershell
supabase db push --yes
```

Result: APPLIED.

Exact migration applied:

```text
20260518180000_child_printing_public_identity_v1.sql
```

No candidate ID backfill was part of this migration.

## Post-Apply Verification

Result: PASS.

Verified:

- linked migration ledger aligned
- `public.card_printings.printing_gv_id` exists
- column is nullable text
- partial unique index exists:
  - `card_printings_printing_gv_id_key`
- total `card_printings`: `55,582`
- populated `printing_gv_id`: `0`
- `printing_gv_id` collision groups: `0`
- blocked candidates remain unassigned/null by design

## Rollback Strategy

If rollback is required before any future backfill:

1. confirm no app release requires `card_printings.printing_gv_id`
2. drop partial unique index `card_printings_printing_gv_id_key`
3. drop nullable column `card_printings.printing_gv_id`

## Confirmations

- no parent `card_prints.gv_id` changes
- no Species Dex denominator changes
- no scanner changes
- no public child route enablement
- no candidate backfill
