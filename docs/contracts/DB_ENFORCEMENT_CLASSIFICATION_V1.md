# DB_ENFORCEMENT_CLASSIFICATION_V1

Status: Active audit document  
Audit date: 2026-04-23

## Live Audit Summary

Audited against live `SUPABASE_DB_URL`:

- Existing enforced uniqueness:
  - `card_print_identity` active `card_print_id`
  - `card_print_identity` active domain hash
  - `card_prints.gv_id`
  - `external_mappings(source, external_id)`
  - `canon_warehouse_promotion_staging` one active row per candidate
- Existing compatibility / public views confirmed:
  - `v_vault_items_web`
  - `v_best_prices_all_gv_v1`
  - `v_wall_cards_v1`
  - `v_wall_sections_v1`
  - `v_section_cards_v1`

Live debt counts observed:

- active identity missing: `11852`
- active identity duplicate rows: `0`
- identity hash collisions: `0`
- card prints missing `gv_id`: `3559`
- duplicate `external_mappings(source, external_id)`: `0`
- duplicate `external_mappings(source, card_print_id)` groups: `152`
- wall membership owner drift: `0`
- warehouse staging without founder approval pair: `0`

## Classification Buckets

- `ENFORCE_NOW_DB`
- `ENFORCE_LATER_DB`
- `VALIDATION_LAYER_ONLY`
- `AUDIT_ONLY`
- `FORBIDDEN_TO_ENFORCE_YET`

## Invariant Classification

| Invariant Name | Current Reality | Risk If Enforced Now | Affected Workers / Views / APIs | Classification | Required Migration Path If Deferred |
| --- | --- | --- | --- | --- | --- |
| Active identity uniqueness per `card_print_id` | Already enforced; live duplicate count `0` | Low | promotion executor, identity backfill, drift audit | `ENFORCE_NOW_DB` | Keep current unique partial index |
| Active identity domain-hash uniqueness | Already enforced; live collision count `0` | Low | identity subsystem, promotion executor | `ENFORCE_NOW_DB` | Keep current unique partial index |
| Every canonical `card_prints` row must have an active identity row | Live missing count `11852` | High; would break existing canonical rows and replay assumptions | promotion executor, bridge/classification reads, compatibility views | `ENFORCE_LATER_DB` | Complete identity backfill, prove zero-missing drift, then add required FK / constraint |
| Every canonical `card_prints` row must have non-null `gv_id` | Live missing count `3559` | High; would break current catalog | gv_id assignment worker, public card/profile reads | `ENFORCE_LATER_DB` | Finish `gv_id` backfill, then evaluate not-null cutover |
| `external_mappings(source, external_id)` uniqueness | Already enforced; live duplicate count `0` | Low | source-backed mapping writer, alias mapping execution, pricing surfaces | `ENFORCE_NOW_DB` | Keep current unique constraint |
| One active mapping per `(source, card_print_id)` | Live duplicate groups `152` (`justtcg` 72, `pokemonapi` 72, `tcgdex` 8) | High; would invalidate current historical/source-backed rows | mapping writers, source readers, pricing surfaces | `FORBIDDEN_TO_ENFORCE_YET` | Repair duplicate historical groups under explicit checkpoint before any schema change |
| Founder approval required before promotion staging | Live drift count `0`, but schema only proves part of the rule | Medium | promotion stage worker, staging reconciliation | `VALIDATION_LAYER_ONLY` | Keep worker/runtime validation until a safe schema model exists |
| One active staging row per candidate | Already enforced by partial unique index | Low | promotion stage worker, promotion executor | `ENFORCE_NOW_DB` | Keep current index |
| Canon candidate bridge payload must include identity evidence payloads | Currently enforced by worker logic, not DB | Medium | bridge worker only | `VALIDATION_LAYER_ONLY` | Keep runtime validation; DB should not parse/write-path JSON assumptions blindly |
| Wall section membership owner must match section owner and exact copy owner | Live drift count `0`; already protected by trigger logic | Low | wall/section writes, public wall views | `ENFORCE_NOW_DB` | Keep existing trigger and audit coverage |
| Quarantine rows must never surface in canonical/public views | No quarantine tables existed before this change | Medium | public views, pricing surfaces, search, wall/profile reads | `AUDIT_ONLY` | Add quarantine tables first, then keep leak detection in drift audit until any surfacing path exists |
| Compatibility views must remain present while stabilization contract is active | Views exist today | Medium; schema replay could drift | web/app reads, wall/profile reads, pricing reads | `AUDIT_ONLY` | Keep drift audit existence checks until cutover contracts retire compatibility views |

## Decision

No blind new DB constraints were added to identity, mapping, or warehouse canonical tables in this runtime slice.

This change only adds new runtime-owned governance tables:

- `public.contract_violations`
- `public.quarantine_records`

Those tables are safe to enforce immediately because they do not reinterpret existing canon; they only preserve evidence and runtime outcomes.
