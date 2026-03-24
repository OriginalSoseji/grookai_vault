# MIGRATION_RECOVERY_CHECKPOINT_V1

## Status
COMPLETE

## Summary
Recovered from remote schema drift caused by direct remote edit that produced `20260323221422_remote_schema.sql`.

Restored full migration determinism and re-established repo as source of truth.

---

## What Happened
- Direct remote schema change created a snapshot-style migration
- Migration included:
  - index creation for JustTCG latest builder
  - unsafe `drop extension unaccent`
- This broke:
  - local replay (`db reset`)
  - migration determinism

---

## Actions Taken
1. Identified remote-only drift (`20260323221422`)
2. Extracted remote migration safely via isolated probe
3. Verified migration contents (index duplication + unsafe extension drop)
4. Quarantined remote snapshot migration (non-replayable)
5. Removed conflicting local migration (`20260323173000`)
6. Created new forward-only migration:
   - `20260324032421_add_justtcg_variant_price_snapshots_latest_order_index_v2`
7. Rebuilt index deterministically using `IF NOT EXISTS`
8. Verified local replay:
   - `supabase db reset --local` passes
9. Repaired migration ledger:
   - marked remote snapshot as reverted
10. Verified strict preflight:
   - no drift
   - expected local-only migration only
11. Pushed clean migration to remote

---

## Final State

### Schema
- Deterministic
- Fully replayable
- No dependency breakage

### Migration Ledger
- Repo and remote aligned
- No remote-only drift
- No duplicate intent

### JustTCG Pricing System
- Latest builder uses DB-native DISTINCT ON strategy
- Supporting index present and correct
- Fully operational

---

## Key Fixes
- Eliminated REST replay builder failure mode
- Removed non-replayable snapshot migration
- Replaced with forward-only deterministic migration

---

## Lessons
- Never rely on remote-generated snapshot migrations
- Direct remote edits must always be reconciled immediately
- Always prove `db reset` before trusting schema state
- Guardrails (preflight + drift detection) prevented silent corruption

---

## Contracts Reinforced
- DRIFT_PREVENTION_V1
- Migration Contract (forward-only, replayable)
- Audit → Contract → Apply → Verify workflow

---

## Next Phase
- Resume feature work (UI / pricing surfaces)
- Fix minor bug in drift_guard.ps1 (`.Count` issue)
- Continue enforcing strict preflight before any push
