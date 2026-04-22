# missing_special_cases_audit_v1

## context

Read-only audit of source-present, special/identity-bearing rows that are unresolved upstream and not yet deterministically attached to Grookai canon.

## why this audit was run

- Perfect Order proved the source-backed warehouse path can carry identity-bearing collisions safely.
- The remaining backlog still mixes stamped promos, gallery/shiny subsets, promo-style aliases, finish-only surfaces, and product noise.
- This pass buckets that backlog without writing canon or promotion state.

## audited source lanes

- discovery candidate generation: backend/ingestion/controlled_growth_ingestion_worker_v1.mjs, backend/ingestion/controlled_growth_non_canonical_filter_worker_v1.mjs, backend/warehouse/justtcg_discovery_worker_v1.mjs, public.external_discovery_candidates, public.raw_imports
- external source normalization: backend/pokemon/pokemonapi_normalize_worker.mjs, backend/pokemon/tcgdex_normalize_worker.mjs, public.raw_imports, public.external_mappings, public.card_prints
- warehouse bridge: backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs, public.external_discovery_candidates, public.canon_warehouse_candidates, public.canon_warehouse_candidate_events
- source-backed intake: backend/warehouse/classification_worker_v1.mjs, backend/warehouse/metadata_extraction_worker_v1.mjs, backend/warehouse/promotion_stage_worker_v1.mjs, backend/warehouse/promotion_executor_v1.mjs, backend/warehouse/source_identity_contract_v1.mjs, public.canon_warehouse_candidates, public.canon_warehouse_promotion_staging
- variant identity resolution: backend/identity/perfect_order_variant_identity_rule_v1.mjs, backend/identity/identity_slot_audit_v1.mjs, backend/identity/identity_resolution_v1.mjs, public.card_prints, public.card_print_identity

## backlog counts by top-level state

- CANON_MISSING_PLAUSIBLE: 1531
- ALREADY_IN_CANON: 1056
- AMBIGUOUS_IDENTITY: 668
- ALIAS_OR_ROUTING_GAP: 306
- PRODUCT_OR_NOISE: 290

## backlog counts by identity bucket

- STAMPED_IDENTITY: 1137
- PROMO_STYLE_IDENTITY: 702
- FINISH_ONLY_NOT_CANON: 514
- SPECIAL_RARITY_IDENTITY: 166
- INSUFFICIENT_EVIDENCE: 107

## priority buckets

- Priority 2 - Needs one bounded rule first: 2033
- Priority 3 - Mapping/routing cleanup only: 935
- Priority 4 - Future printing layer: 514
- Priority 5 - Reject/noise: 290
- Priority 1 - Ready for warehouse now: 79

## highest-value missing-card classes

- justtcg | arceus-pokemon | Ponyta (Shiny) | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | arceus-pokemon | Bagon (Shiny) | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | arceus-pokemon | Arceus (AR4) | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | arceus-pokemon | Arceus (AR5) | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | arceus-pokemon | Arceus (AR2) | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | arceus-pokemon | Arceus (AR8) | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | arceus-pokemon | Arceus (AR7) | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | arceus-pokemon | Arceus (AR3) | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | black-and-white-promos-pokemon | Lugia EX (Team Plasma) - BW83 | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | black-and-white-promos-pokemon | Rayquaza EX -BW47 | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE

## exact blockers

- unique_underlying_canon_match_supports_missing_special_identity: 1340
- exact_canonical_match_exists: 629
- finish_only_surface_attaches_to_existing_canon: 427
- insufficient_source_or_routing_evidence: 395
- underlying_canon_exists_but_source_route_is_missing: 306
- non_canonical_product_or_deck_slot_surface: 290
- multiple_possible_underlying_canonical_rows: 176
- same_set_base_match_exists_but_special_identity_row_is_missing: 129
- finish_only_surface_without_unique_underlying_match: 87
- canonical_set_exists_but_special_identity_row_is_missing: 62
- canonical_set_absent_from_canon_outside_special_pass: 10

## recommended next execution order

1. Handle Priority 3 mapping/routing cleanup first so alias-only source rows stop inflating the special backlog.
2. Take the stamped-identity backlog next, starting with rows that already have a same-set or unique underlying canonical match.
3. Queue Priority 1 promo-style and special-rarity rows that already resolve to an existing canonical set for warehouse intake.
4. Work the remaining manual-review promo/special-rarity rows after routing cleanup so bounded alias fixes can collapse the queue.
5. Defer finish-only surfaces to the future printing layer and rerun this audit after each completed bucket.

## representative examples

- justtcg | arceus-pokemon | Arceus (AR2) | CANON_MISSING_PLAUSIBLE | PROMO_STYLE_IDENTITY | WAREHOUSE_INTAKE
- justtcg | me03-perfect-order-pokemon | Mega Clefable ex - 119/088 | CANON_MISSING_PLAUSIBLE | SPECIAL_RARITY_IDENTITY | WAREHOUSE_INTAKE
- justtcg | alternate-art-promos-pokemon | Aegislash EX - 65a/119 | AMBIGUOUS_IDENTITY | PROMO_STYLE_IDENTITY | MANUAL_REVIEW_REQUIRED
- justtcg | alternate-art-promos-pokemon | Alolan Sandshrew - 19a/145 | CANON_MISSING_PLAUSIBLE | PROMO_STYLE_IDENTITY | MANUAL_REVIEW_REQUIRED
- justtcg | alternate-art-promos-pokemon | Heatran - 88/156 (Prerelease) | CANON_MISSING_PLAUSIBLE | STAMPED_IDENTITY | NEW_VARIANT_RULE_REQUIRED
- justtcg | battle-academy-2022-pokemon | Pokemon Catcher - 175/202 (#49 Cinderace Stamped) | AMBIGUOUS_IDENTITY | STAMPED_IDENTITY | NEW_VARIANT_RULE_REQUIRED
- justtcg | deck-exclusives-pokemon | Ampharos - 1/132 (DP Secret Wonders) | AMBIGUOUS_IDENTITY | INSUFFICIENT_EVIDENCE | MANUAL_REVIEW_REQUIRED
- justtcg | generations-radiant-collection-pokemon | Altaria | CANON_MISSING_PLAUSIBLE | SPECIAL_RARITY_IDENTITY | NEW_VARIANT_RULE_REQUIRED
- justtcg | generations-radiant-collection-pokemon | Flabebe | AMBIGUOUS_IDENTITY | SPECIAL_RARITY_IDENTITY | MANUAL_REVIEW_REQUIRED
- justtcg | aquapolis-pokemon | Ampharos (H1) | ALREADY_IN_CANON | null | MAPPING_REPAIR
- justtcg | deck-exclusives-pokemon | Absol - 097/189 | ALIAS_OR_ROUTING_GAP | null | ALIAS_REPAIR
- justtcg | alternate-art-promos-pokemon | Garbodor - 51a/145 (Cosmos Holo) | ALREADY_IN_CANON | FINISH_ONLY_NOT_CANON | FUTURE_PRINTING_LAYER
- justtcg | blister-exclusives-pokemon | Ampharos - 40/124 (Cosmos Holo) | AMBIGUOUS_IDENTITY | FINISH_ONLY_NOT_CANON | FUTURE_PRINTING_LAYER
- justtcg | dragons-exalted-pokemon | Dragons Exalted Booster Box | PRODUCT_OR_NOISE | null | REJECT_AS_PRODUCT_NOISE

## verification

- backlog rows are read-only and reproducible from source lanes
- no canon writes occurred
- no promotion executor or global mutation ran

