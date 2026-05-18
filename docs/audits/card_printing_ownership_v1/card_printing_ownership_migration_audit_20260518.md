# Card Printing Ownership V1 Migration Audit

Date: 2026-05-18
Branch: `scanner-v4-card-present-gate`
Head at audit start: `be9e48c`

## Scope

Audit and controlled apply plan for:

- `supabase/migrations/20260518123000_card_printing_ownership_v1.sql`

This lane adds optional child-printing ownership to the existing `vault_item_instances` ownership model. It does not change Species Dex denominators, scanner behavior, GV-ID gates, or parent card ownership semantics.

## Migration Summary

The migration:

- Adds nullable `public.vault_item_instances.card_printing_id`.
- Adds a foreign key to `public.card_printings(id)` with `on delete restrict`.
- Adds indexes for `card_printing_id` and active user/printing lookup.
- Adds `public.assert_vault_item_instance_card_printing_parent_v1()` trigger function.
- Adds a trigger that rejects rows where `card_printing_id` does not belong to the same `card_print_id`.
- Adds an extended overload of `public.admin_vault_instance_create_v1(...)` with optional `p_card_printing_id uuid default null`.

## Affected Objects

- Table: `public.vault_item_instances`
- Table: `public.card_printings` as referenced parent for child printing identity
- Function: `public.assert_vault_item_instance_card_printing_parent_v1()`
- Trigger: `trg_vault_item_instances_card_printing_parent_v1`
- Function overload: `public.admin_vault_instance_create_v1(..., p_card_printing_id uuid default null)`
- Web write helper: `apps/web/src/lib/vault/addCardToVault.ts`
- Web read helpers:
  - `apps/web/src/lib/vault/getOwnedPrintingCountsByCardPrintIds.ts`
  - `apps/web/src/lib/vault/getOwnedObjectSummaryForCard.ts`
  - `apps/web/src/lib/publicSetsOwnership.ts`
  - `apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts`

## Compatibility Analysis

Parent-only ownership remains compatible:

- `card_printing_id` is nullable.
- Existing `vault_item_instances` rows do not need a finish.
- Existing parent-only inserts continue to pass because the trigger returns immediately when `card_printing_id is null`.
- Existing active ownership semantics remain `archived_at is null`.
- No ownership row is reused by the migration.
- No archived rows are mutated.
- Species Dex completion still counts parent `card_print_id`, not child finish rows.

The extended RPC uses an added optional parameter. Existing callers that omit `p_card_printing_id` remain compatible. Finish-aware callers pass `p_card_printing_id` only after the app validates the selected child belongs to the current parent `card_print_id`.

## Risk Analysis

Primary risks:

- Function overload ambiguity if named-argument resolution behaves unexpectedly in Supabase/PostgREST RPC calls.
- Remote partial-object drift if `card_printing_id`, trigger, or function already exists outside migration history.
- Local reset failures from older migration debt unrelated to this lane.
- Finish-specific writes will fail until the migration is applied remotely.

Mitigations:

- Do not run `supabase db push` unless linked ledger is clean except expected local-only migration.
- Run strict migration preflight and local reset before remote apply.
- Run remote read-only checks before apply.
- Confirm `supabase db push` wants exactly `20260518123000`.
- Post-apply verify column, trigger/function, ledger, and unchanged vault instance count.

## Dry-Run Plan

1. Run repo and migration ledger preflight.
2. Run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema`.
3. Run `supabase db reset --local`.
4. If local reset succeeds, run local SQL checks where possible:
   - column exists
   - trigger/function exists
   - parent-only insert path remains valid if a safe harness is available
   - matching child insert is accepted if a safe harness is available
   - mismatched child insert is rejected if a safe harness is available

No DB writes are permitted against linked remote during dry-run.

## Apply Plan

Apply only if all gates pass:

```powershell
supabase db push
```

Apply must be rejected if Supabase proposes any migration other than:

- `20260518123000_card_printing_ownership_v1.sql`

Do not use migration repair, `--include-all`, dashboard SQL editor, or ad hoc partial SQL.

## Rollback Plan

Preferred rollback is forward-only:

- If app verification fails after apply, revert or patch application behavior and keep schema additive.
- If schema validation shows unexpected behavior, create a new corrective migration after audit.

Emergency rollback migration, only with explicit approval:

- Remove/replace the trigger if it blocks legitimate parent-only ownership writes.
- Leave nullable column in place unless a full dependent-object audit proves it is unused.

No destructive rollback is pre-approved.

## Post-Verify Checklist

- `supabase migration list --linked` shows `20260518123000` applied on remote.
- `vault_item_instances.card_printing_id` exists and is nullable.
- Parent/child validation trigger and function exist.
- Existing `vault_item_instances` count is unchanged by the migration.
- Parent-only ownership path remains valid.
- Matching finish-specific ownership is accepted.
- Mismatched finish-specific ownership is rejected.
- Web verification passes:
  - `npm --prefix apps/web run typecheck`
  - `npm --prefix apps/web run lint`
  - `npm --prefix apps/web run build`
  - `npm run contracts:test`
  - `npm run contracts:runtime-health`
  - `git diff --check`

## Current Audit Status

Preflight ledger status:

- PASS for migration ledger shape.
- `20260518123000` is the only local-only migration.
- No remote-only migration was observed.

Strict linked schema preflight:

- BLOCKED.
- First run failed because local Docker port `54331` was already allocated.
- `supabase stop --project-id ycdxbpibncqcchqiihfz` was run to stop the stale local Supabase setup.
- Second run timed out after ten minutes while running the strict preflight path.
- A temporary Docker container using `54331` was stopped after the timeout.

Local dry-run status:

- NOT RUN.
- `supabase db reset --local` was intentionally not run because the prior strict preflight gate did not pass.

Remote read-only precheck status:

- NOT RUN.
- Remote SQL checks were intentionally not run after the strict preflight timeout.

Apply status:

- NOT APPLIED.
- `supabase db push` was not run.

Push status:

- NOT PUSHED.
- Branch push was intentionally withheld because the apply gate did not pass.
