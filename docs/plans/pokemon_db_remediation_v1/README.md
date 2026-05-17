# Pokemon DB Remediation V1

Status: remediation planning index. Executed DB route-classification changes in this remediation thread are documented separately in `set_alias_route_classification_execution_20260517.md` and `source_route_classification_execution_20260517.md`. No additional Supabase writes, migrations, inserts, updates, deletes, migration repair, `db pull`, or production data mutation are authorized by this plan index.

## Source Audit References

- `docs/audits/pokemon_master_set_audit_v1/pokemon_master_set_audit_v1.md`
- `docs/audits/pokemon_master_set_audit_v1/summary.json`
- `scripts/audits/pokemon_master_set_audit_v1.mjs`

The source audit was read-only against live Supabase inventory and external English Pokemon TCG checklist sources. PkmnCards is treated as the numbered-card checklist source, while PokemonTCG API and TCGdex are corroborating source and variant-signal inputs.

## Headline Findings

| Finding | Count |
| --- | ---: |
| DB physical Pokemon set rows audited | 239 |
| External PkmnCards master set/collection pages parsed | 194 |
| Master card checklist rows parsed | 20,884 |
| Missing DB checklist rows vs PkmnCards | 617 |
| Missing secret-range cards | 30 |
| Master sets with no DB match | 18 |
| Duplicate DB physical set names | 29 |
| DB variant slots | 2,901 |
| TCGdex variant signals | 21,066 |
| PokemonTCG/TCGPlayer variant signals | 32,449 |

## Remediation Order

1. Set canonicalization
2. Missing set universe decision
3. Number normalization
4. Missing card checklist backfill
5. Variant model remediation

This order is mandatory. It keeps identity, set ownership, and printed-number semantics stable before any future data backfill is considered.

## Why Missing Card Import Is Not First

The 617 missing checklist rows are not a simple insert queue. The audit also found duplicate/alias set rows, unmatched master sets, recoverable printed numbers hidden in source fields, and large variant-model gaps. Importing missing cards first would route cards into ambiguous target sets, inflate existing duplicate rows, and make later canonicalization harder because new card rows would inherit unresolved set ownership and number-normalization defects.

No card row should be imported until the canonical target set is resolved and printed identity is proven. Secret-range cards need an even stronger ownership check because they often expose the exact places where source checklist semantics diverge.

## Plan Files

- `set_canonicalization_plan.md`
- `set_canonicalization_dry_run_20260517.md`
- `set_alias_dependency_audit_20260517.md`
- `set_alias_dependency_matrix_20260517.json`
- `set_alias_write_plan_dry_run_20260517.md`
- `set_alias_write_plan_matrix_20260517.json`
- `set_alias_prewrite_evidence_20260517.md`
- `set_alias_prewrite_evidence_matrix_20260517.json`
- `set_alias_route_classification_write_plan_20260517.md`
- `set_alias_route_classification_write_plan_20260517.sql`
- `set_alias_route_classification_execution_20260517.md`
- `set_alias_metadata_preservation_plan_20260517.md`
- `set_alias_metadata_preservation_matrix_20260517.json`
- `missing_sets_plan.md`
- `missing_set_universe_decision_20260517.md`
- `missing_set_universe_decision_matrix_20260517.json`
- `source_route_equivalence_evidence_20260517.md`
- `source_route_equivalence_evidence_matrix_20260517.json`
- `source_route_classification_write_plan_20260517.md`
- `source_route_classification_write_plan_20260517.sql`
- `source_route_classification_write_plan_matrix_20260517.json`
- `source_route_classification_execution_20260517.md`
- `public_route_search_resolver_impact_review_20260517.md`
- `public_route_search_resolver_impact_matrix_20260517.json`
- `public_route_search_resolver_patch_20260517.md`
- `number_normalization_plan.md`
- `number_normalization_evidence_20260517.md`
- `number_normalization_evidence_matrix_20260517.json`
- `number_normalization_candidate_evidence_20260517.md`
- `number_normalization_candidate_evidence_matrix_20260517.json`
- `number_normalization_collision_investigation_20260517.md`
- `number_normalization_collision_investigation_matrix_20260517.json`
- `number_normalization_me01_duplicate_ownership_20260517.md`
- `number_normalization_me01_duplicate_ownership_matrix_20260517.json`
- `number_normalization_me01_duplicate_resolution_design_20260517.md`
- `number_normalization_me01_duplicate_resolution_design_20260517.sql`
- `number_normalization_lane_a_248_write_plan_20260517.md`
- `number_normalization_lane_a_248_write_plan_20260517.sql`
- `number_normalization_lane_a_248_write_plan_matrix_20260517.json`
- `number_normalization_lane_a_248_preexecution_gate_20260517.md`
- `number_normalization_lane_a_248_preexecution_gate_matrix_20260517.json`
- `number_normalization_dry_run_implementation_plan_20260517.md`
- `number_normalization_dry_run_implementation_plan_20260517.sql`
- `missing_cards_backfill_plan.md`
- `missing_cards_backfill_evidence_20260517.md`
- `missing_cards_backfill_evidence_matrix_20260517.json`
- `missing_cards_backfill_dry_run_implementation_plan_20260517.md`
- `missing_cards_backfill_dry_run_implementation_plan_20260517.sql`
- `variant_model_plan.md`
- `variant_authority_model_v2_plan_20260517.md`
- `variant_authority_model_v2_matrix_20260517.json`
- `pokemon_db_remediation_v1_checkpoint_20260517.md`
- `pokemon_db_remediation_v1_execution_queue_20260517.md`
- `pokemon_db_remediation_v1_execution_queue_20260517.json`

## Review Checklist Before Implementation

- Confirm the migration ledger is still aligned before any future implementation pass.
- Rerun the master set audit or an approved dry-run derivative from the latest data.
- Approve one canonical DB set per English physical set and document aliases/source mappings.
- Classify all 18 missing master sets before creating or mapping any target sets.
- Prove printed card numbers from canonical source fields, not generated fields alone.
- Review every secret-range candidate against source pages and set ownership.
- Approve a separate variant authority contract before modeling variants.
- Require a fresh no-write dry-run report with zero ambiguous target sets before any write plan.
