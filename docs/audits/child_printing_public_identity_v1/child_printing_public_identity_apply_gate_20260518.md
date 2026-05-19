# Child Printing Public Identity V1 Apply Gate

Generated: 2026-05-18

Status: BLOCKED BEFORE APPLY.

## Link Recovery

- project ref discovered: `ycdxbpibncqcchqiihfz`
- project ref source: `supabase/config.toml`
- linked status: PASS

## Linked Migration Ledger

Command:

```powershell
supabase migration list --linked
```

Result: PASS.

The linked ledger is readable. The only local-only migration visible at the tail of the ledger is:

```text
20260518180000_child_printing_public_identity_v1.sql
```

That is the expected `CHILD_PRINTING_PUBLIC_IDENTITY_V1` nullable schema migration.

## Shadow Port Recovery

The stale shadow container on `54331` was removed after inspection. Additional auto-remove shadow containers created by later diff attempts were also stopped only after confirming they were Supabase shadow Postgres containers for project `ycdxbpibncqcchqiihfz`.

The normal local Supabase DB container on `54330` was preserved.

## Strict Migration Preflight

Command:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
```

Result: FAIL.

The strict guard now completes without hanging. It fails because `supabase db diff --linked` returns a non-empty schema diff.

Important diff classes observed:

- expected local-only `card_printings.printing_gv_id` / `card_printings_printing_gv_id_key` delta
- unrelated extension/schema changes
- many view drops/recreates
- `admin.import_runs`
- `ingest.card_prints_raw`
- `public.collapse_map_phase1`
- `public.scanner_fingerprint_index`
- `pricing_jobs.locked_at`
- `pricing_jobs.locked_by`
- `sets` metadata columns

This means the apply gate is not clean.

## Local Replay

Command:

```powershell
supabase db reset --local
```

Result: NOT RUN.

Reason: strict linked-schema preflight failed first.

## Live Candidate Regeneration

Command:

```powershell
node scripts/audits/child_printing_public_identity_v1.mjs
```

Result: NOT RUN in this apply-gate attempt.

Reason: strict linked-schema preflight failed first.

Previously committed dry-run evidence remains:

- total child printings: `55,582`
- approved candidates: `44,698`
- blocked parent missing gv_id: `10,377`
- blocked parent variant boundary: `507`
- proposed collisions: `0`
- unsupported finish keys: `0`

Those counts were not refreshed in this blocked gate attempt.

## Remote Read-Only Precheck

Result: NOT RUN.

Reason: strict linked-schema preflight failed first.

## Apply Decision

Decision: DO NOT APPLY.

Reason: strict linked-schema preflight does not pass. The migration remains drafted only.

## Rollback Strategy

No rollback is required because no database write occurred.

If a future approved run applies the nullable schema migration, rollback remains:

1. confirm no app release requires `card_printings.printing_gv_id`
2. clear any future assigned `printing_gv_id` values if a later backfill has occurred
3. drop the partial unique index
4. drop the nullable column

## Post-Apply Checklist For Future Run

- linked migration ledger aligned
- linked schema diff reconciled or formally accepted
- local replay passes
- live candidate regeneration has drift count `0`
- `printing_gv_id` absent before apply
- child printing count matches regenerated audit
- proposed collision count remains `0`
- Supabase `db push` proposes only `20260518180000_child_printing_public_identity_v1.sql`
- `printing_gv_id` exists after apply
- partial unique index exists after apply
- no parent `card_prints.gv_id` changed
- Species Dex denominator unchanged
- no public child route enabled
- blocked candidates remain blocked
