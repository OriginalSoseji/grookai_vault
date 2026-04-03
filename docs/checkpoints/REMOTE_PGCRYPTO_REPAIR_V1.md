# REMOTE_PGCRYPTO_REPAIR_V1

Date: 2026-04-02

## Symptom

`supabase db push` against remote stopped after partially applying the Phase 8 migration chain.

- remote had already recorded `20260402100000__card_print_identity_table.sql`
- remote had already recorded `20260402100001__card_print_identity_indexes.sql`
- remote then failed at `20260402100002__card_print_identity_support_functions.sql`
- reproduced SQLSTATE: `42883`
- reproduced error text: `function digest(text, unknown) does not exist`

## Remote Partial-Apply Reality

Pre-repair remote audit proved the state was real and explainable:

- `public.card_print_identity` existed
- support indexes from `20260402100001` existed
- `public.card_print_identity_hash_v1` did not exist
- remote identity row count was `0`
- remote BA `card_prints` row count was `0`
- remote BA identity row count was `0`

No backfill and no BA promotion side effects had landed remotely before repair.

## Audit Findings

The original root-cause candidate was "missing `pgcrypto` on remote".

The read-only remote audit disproved that:

- `pgcrypto` was already installed remotely
- `pgcrypto` lived in schema `extensions`
- remote default session `search_path` included `extensions`
- a migration-like empty `search_path` reproduction failed on unqualified `digest(...)`

That made the real issue migration-time name resolution, not missing extension installation.

## Why `digest()` Failed Remotely

`20260402100002__card_print_identity_support_functions.sql` referenced `digest(...)` unqualified inside a function body.

Under the migration execution context, the function body was parsed without a search path that could resolve `digest` from `extensions`, so creation failed even though `pgcrypto` already existed.

## Repair Decision

The audited state disproved the original "missing extension" hypothesis, so the repair stayed minimal and semantic-preserving:

1. keep the migration self-sufficient with `create extension if not exists pgcrypto with schema extensions;`
2. schema-qualify the hash call as `extensions.digest(...)`

No hash inputs, function signatures, serialization rules, or identity semantics were changed.

## Exact Migration Repair

Edited:

- `supabase/migrations/20260402100002__card_print_identity_support_functions.sql`

Changes:

- added `create extension if not exists pgcrypto with schema extensions;` immediately after `begin;`
- changed the single hash call from `digest(...)` to `extensions.digest(...)`

## Local Replay Proof

Local replay passed after the repair:

- `supabase db reset --local` completed successfully
- `20260402100002` applied cleanly
- `backend/pricing/ba_phase8_identity_subsystem_verify_v1.mjs` passed
- a local serializer/hash check confirmed SQL hash output still matched Node `sha256` over the exact serialized identity key

## Remote Push Result

The repaired remote retry advanced past the original failure:

- `20260402100002` applied successfully
- `20260402100003` applied successfully

The push then stopped on a new blocker:

- failed migration: `20260402100004__card_print_identity_backfill.sql`
- SQLSTATE: `P0001`
- error: `card_print_identity backfill blocked: 10620 rows are not classifiable under Phase 8 approved domains; reasons=[{"row_count": 10620, "block_reason": "MISSING_PRINTED_NUMBER"}]`

Per stop rule, work ended there. No manual migration marking was used.

## Post-Retry Remote Audit Result

Remote state after the repaired retry:

- applied migrations: `20260402100000` through `20260402100003`
- missing migrations: `20260402100004` through `20260402100008`
- `public.card_print_identity_hash_v1` now exists remotely
- remote identity row count remains `0`
- remote BA `card_prints` row count remains `0`
- remote BA identity row count remains `0`
- remote `tcg_pocket` identity row count remains `0`

## Statement

This repair fixed a missing `pgcrypto` dependency resolution problem in the remote migration path. It did not alter identity semantics, did not bypass migration history, did not manually mark migrations applied, and did not promote BA canon rows.
