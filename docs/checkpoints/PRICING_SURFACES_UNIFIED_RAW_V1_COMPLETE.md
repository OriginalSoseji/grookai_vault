Pricing Surfaces Unified — Raw-only V1 (COMPLETE)

Date: 2026-02-18
Status: COMPLETE (Locked)

Summary

Production Hardening Phase 1 milestone completed: Grookai Vault pricing surfaces are unified to Grookai Value V1 (raw-only) with truthful source reporting and verified end-to-end backfill for vault items.

What Changed

Created public.v_grookai_value_v1 (Grookai Value V1): liquidity-weighted NM blend bounded to [nm_floor, nm_median] with confidence tempering and reclamp.

Introduced compatibility surface public.v_best_prices_all_gv_v1 (same column shape as legacy v_best_prices_all) sourcing base_market from Grookai Value V1.

Rewired public.v_vault_items and public.v_vault_items_ext to use v_best_prices_all_gv_v1 (DB-first; no UI changes).

Enforced raw-only behavior (graded/condition market lanes intentionally NULL in GV surface for V1).

Fixed “ghost rows” behavior: when Grookai Value is NULL, base_source and base_ts are NULL (no misleading source).

Operationally backfilled unpriced vault prints using backend/pricing/ebay_browse_prices_worker.mjs until vault achieved full pricing coverage.

Verification Proofs (Observed)

v_grookai_value_v1 bounds violations = 0 (clamped correctly).

Vault pricing surface after backfill:

vault_rows = 15

priced_rows = 15

grookai_sourced_rows = 15

null_source_rows = 0

Raw-only enforcement verified:

v_vault_items_ext graded/condition modes = 0

Notes / Intentional Deferrals

Condition multipliers beyond NM (LP/MP/HP/DMG) are deferred.

Graded market lanes are deferred until unified pricing surfaces are stable and audited for a versioned reintroduction.

Artifacts

Views: public.v_grookai_value_v1, public.v_best_prices_all_gv_v1

Vault surfaces: public.v_vault_items, public.v_vault_items_ext, public.v_recently_added, public.v_vault_items_web

Worker: backend/pricing/ebay_browse_prices_worker.mjs
