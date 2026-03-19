# DB_REPLAY_STEP2_1 — Printings Surface Audit

Date: 2026-03-04  
Scope: Audit-only (no schema edits, no migrations, no refactors)

## Objective
Determine why Step 2 invariant expected `public.card_printings` while local replayed DB does not contain it.

## 1) Repo Contract Audit (Ground Truth)

### A) Authoritative contract docs scan
Scanned:
- `docs/contracts/**`
- `docs/CONTRACT_INDEX.md`
- `docs/GROOKAI_RULEBOOK.md`
- `docs/contracts/GV_SCHEMA_CONTRACT_V1.md`

Search terms:
- `card_printings`
- `card_printing`
- `finish_key`
- `external_printing_mappings`
- `premium_parallel_eligibility`
- `VARIANT_CONTRACT_V1`
- `include_reverse`
- `include_tg_routing`

Result:
- No matches in authoritative contract/index/rulebook/schema docs for any of the above terms.
- Evidence: `docs/release/logs/DB_REPLAY_STEP2_1_authoritative_contract_scan.log`

### B) Non-authoritative references found
References exist in playbooks and tooling code:
- `docs/playbooks/SET_REPAIR_PROTOCOL_V1.md`
- `docs/playbooks/SET_REPAIR_RUNNER_V1.md`
- `docs/playbooks/TK_SAFE_PRINTING_MAPPER_V1.md`
- `docs/playbooks/MAPPING_COVERAGE_ALIAS_CANON_TK_PLAYBOOK_V1.md`
- `backend/tools/set_repair_runner.mjs`
- `backend/tools/tk_safe_printing_mapper.mjs`

These references consistently expect:
- `public.card_printings`
- `public.external_printing_mappings`
- `public.finish_keys`
- `finish_key` column semantics

Evidence: `docs/release/logs/DB_REPLAY_STEP2_1_playbook_tool_hits.log`

## 2) Migration Ledger Audit

Scan targets:
- `supabase/migrations`
- `docs/legacy_migrations_v0`
- `supabase/_migration_quarantine`

Queries performed:
- term scan for `card_printings|external_printing_mappings|finish_keys|finish_key|card_printing`
- DDL scan for:
  - `create table ... card_printings`
  - `alter table ... card_printings`
  - `drop table ... card_printings`
  - rename patterns to/from `card_printings`

Result:
- No matches found.
- No evidence that `card_printings` was ever created, dropped, altered, or renamed in tracked migration/quarantine/legacy SQL.

Evidence:
- `docs/release/logs/DB_REPLAY_STEP2_1_migration_term_hits.log`
- `docs/release/logs/DB_REPLAY_STEP2_1_migration_ddl_hits.log`

## 3) Database Reality Audit (Local)

Required SQL:
```sql
SELECT n.nspname, c.relname, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname ILIKE 'card_printing%' OR c.relname ILIKE '%printing%';
```

Result:
- `(0 rows)` — no objects matching `card_printing%` or `%printing%`.
- Evidence: `docs/release/logs/DB_REPLAY_STEP2_1_required_printing_query.log`

Additional validation:
- `%finish%` relation scan: `(0 rows)` (`docs/release/logs/DB_REPLAY_STEP2_1_finish_like_query.log`)
- `%printing%`/`%finish%` routines scan: `(0 rows)` (`docs/release/logs/DB_REPLAY_STEP2_1_routines_printing_finish.log`)
- `card_print%` scan shows `public.card_prints` exists (`docs/release/logs/DB_REPLAY_STEP2_1_card_print_prefix_query.log`)
- `public.card_prints` columns do not include `finish_key` (`docs/release/logs/DB_REPLAY_STEP2_1_card_prints_columns.log`)
- Global finish-column scan only found `public.jobs.finished_at` (`docs/release/logs/DB_REPLAY_STEP2_1_finish_columns_query.log`)

## 4) Outcome Classification

## CASE 3 — Ambiguous

Why:
- The expected printing-layer object names are present in playbooks/tooling, but absent from authoritative contracts and absent from all tracked migrations.
- No migration ledger evidence exists for create/drop/rename of `card_printings`, so intended replacement or canonical name cannot be proven from schema history.

This triggers the step STOP condition:
- Cannot prove expected name from repo contracts/migrations.

## Next Single-Step Recommendation (Do Not Implement Here)
Create one authoritative decision artifact (contract-level) that explicitly defines the canonical printing layer and required schema objects, then gate implementation in a follow-up migration step.

Minimum artifact needed:
1. A contract doc added to the authoritative contract index that declares either:
   - canonical tables: `public.card_printings`, `public.external_printing_mappings`, `public.finish_keys`, or
   - explicit replacement names if different.
2. A single forward-only migration plan aligned to that contract (separate step), not implemented in this audit step.
