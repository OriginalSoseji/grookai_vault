# Child Printing Public Identity V1 Apply Gate

Generated: 2026-05-18

Status: BLOCKED BEFORE APPLY.

## Link Recovery

- project ref discovered: `ycdxbpibncqcchqiihfz`
- project ref source: `supabase/config.toml`
- command: `supabase link --project-ref ycdxbpibncqcchqiihfz`
- result: linked successfully

## Linked Migration Ledger

Ledger command:

```powershell
supabase migration list --linked
```

Result: PASS.

The linked ledger is readable. The only local-only migration visible at the tail of the ledger is:

```text
20260518180000_child_printing_public_identity_v1.sql
```

That is the expected `CHILD_PRINTING_PUBLIC_IDENTITY_V1` nullable schema migration.

## Repo Preflight

Command:

```powershell
npm run preflight
```

Result: PASS_WITH_DEFERRED_DEBT.

The preflight reported no critical failures and known deferred debt only.

## Strict Migration Preflight

Command:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
```

Result: BLOCKED.

The command did not complete within the configured 4-minute command timeout. Per the lane rules, the apply path stops here. No local replay, remote candidate regeneration, remote read-only precheck, or migration apply was run after this timeout.

## Local Replay

Command:

```powershell
supabase db reset --local
```

Result: NOT RUN.

Reason: strict migration preflight timed out first.

## Live Candidate Regeneration

Command:

```powershell
node scripts/audits/child_printing_public_identity_v1.mjs
```

Result: NOT RUN in this apply-gate attempt.

Reason: strict migration preflight timed out first.

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

Reason: strict migration preflight timed out first.

## Apply Decision

Decision: DO NOT APPLY.

Reason: strict linked-schema preflight did not complete. The migration remains drafted only.

## Rollback Strategy

No rollback is required because no database write occurred.

If a future approved run applies the nullable schema migration, rollback remains:

1. confirm no app release requires `card_printings.printing_gv_id`
2. clear any future assigned `printing_gv_id` values if a later backfill has occurred
3. drop the partial unique index
4. drop the nullable column

## Post-Apply Checklist For Future Run

- linked migration ledger aligned
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
