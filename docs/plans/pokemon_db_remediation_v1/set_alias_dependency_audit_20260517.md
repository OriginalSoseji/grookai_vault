# Set Alias Dependency Audit - 2026-05-17

Status: dependency discovery only. This audit performed read-only Supabase queries inside `begin transaction read only` and made no database changes.

## Scope

- Alias-candidate groups audited: 20
- Review stops excluded: 5
- Hard stops excluded: 4
- Future architecture assumption: canonical physical set plus permanent alias/source-routing layer.

Excluded hard stops: `sv04.5` vs `sv4pt5`, `pgo` vs `swsh10.5`, `sv08.5` vs `sv8pt5`, `sv06.5` vs `sv6pt5`.

## Summary

| Metric | Count |
| --- | --- |
| Alias pairs audited | 20 |
| Safe-looking for future write-plan design | 20 |
| Blocked or unexpectedly risky | 0 |
| Metadata-only alias rows | 20 |
| Route-preservation candidates | 20 |


## Pair Matrix

| Name key | Canonical candidate | Alias candidate | Canonical cards | Alias cards | Overlap | Mapping owner | Future write-plan candidate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 151 | `sv03.5` | `sv3pt5` | 210 | 0 | 0 | canonical | yes |
| black bolt | `sv10.5b` | `zsv10pt5` | 180 | 0 | 0 | canonical | yes |
| champions path | `swsh3.5` | `swsh35` | 83 | 0 | 0 | canonical | yes |
| crown zenith | `swsh12.5` | `swsh12pt5` | 167 | 0 | 0 | canonical | yes |
| dragon majesty | `sm75` | `sm7.5` | 78 | 0 | 0 | canonical | yes |
| heartgold soulsilver promos | `hsp` | `hgssp` | 25 | 0 | 0 | canonical | yes |
| journey together | `sv09` | `sv9` | 198 | 0 | 0 | canonical | yes |
| legendary collection | `base6` | `lc` | 110 | 0 | 0 | canonical | yes |
| mega evolution | `me01` | `me1` | 300 | 0 | 0 | canonical | yes |
| obsidian flames | `sv03` | `sv3` | 237 | 0 | 0 | canonical | yes |
| paradox rift | `sv04` | `sv4` | 292 | 0 | 0 | canonical | yes |
| phantasmal flames | `me02` | `me2` | 131 | 0 | 0 | canonical | yes |
| scarlet and violet | `sv01` | `sv1` | 283 | 0 | 0 | canonical | yes |
| shining fates | `swsh4.5` | `swsh45` | 75 | 0 | 0 | canonical | yes |
| shining legends | `sm3.5` | `sm35` | 78 | 0 | 0 | canonical | yes |
| stellar crown | `sv07` | `sv7` | 194 | 0 | 0 | canonical | yes |
| surging sparks | `sv08` | `sv8` | 271 | 0 | 0 | canonical | yes |
| temporal forces | `sv05` | `sv5` | 246 | 0 | 0 | canonical | yes |
| twilight masquerade | `sv06` | `sv6` | 255 | 0 | 0 | canonical | yes |
| white flare | `sv10.5w` | `rsv10pt5` | 177 | 0 | 0 | canonical | yes |


## Dependency Findings

### sv03.5 -> sv3pt5

- Card ownership: canonical=210, alias=0, overlap=0.
- Unique identity keys: canonical=207, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=416, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=210, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=3, card_print_price_curves.card_print_id=21, card_print_traits.card_print_id=207, card_printings.card_print_id=360, ebay_active_price_snapshots.card_print_id=21, ebay_active_prices_latest.card_print_id=20, external_discovery_candidates.card_print_id=206, external_mappings.card_print_id=416, justtcg_variant_price_snapshots.card_print_id=3708, justtcg_variant_prices_latest.card_print_id=1392, justtcg_variants.card_print_id=1392, pricing_jobs.card_print_id=35, pricing_watch.card_print_id=8, shared_cards.card_id=5, vault_item_instances.card_print_id=8, vault_items.card_id=8.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: apps/web/src/app/explore/page.tsx; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=1082, set_code_classification.set_code=1.

### sv10.5b -> zsv10pt5

- Card ownership: canonical=180, alias=0, overlap=0.
- Unique identity keys: canonical=172, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=352, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=180, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=8, card_print_price_curves.card_print_id=18, card_print_traits.card_print_id=172, card_printings.card_print_id=516, ebay_active_price_snapshots.card_print_id=18, ebay_active_prices_latest.card_print_id=18, external_mappings.card_print_id=352, justtcg_variant_price_snapshots.card_print_id=1929, justtcg_variant_prices_latest.card_print_id=726, justtcg_variants.card_print_id=726, pricing_jobs.card_print_id=29.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=756, set_code_classification.set_code=1.

### swsh3.5 -> swsh35

- Card ownership: canonical=83, alias=0, overlap=0.
- Unique identity keys: canonical=80, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=239, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=83, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=3, card_print_identity.card_print_id=80, card_print_price_curves.card_print_id=7, card_print_traits.card_print_id=80, card_printings.card_print_id=134, ebay_active_price_snapshots.card_print_id=7, ebay_active_prices_latest.card_print_id=7, external_mappings.card_print_id=239, justtcg_variant_price_snapshots.card_print_id=1326, justtcg_variant_prices_latest.card_print_id=521, justtcg_variants.card_print_id=521, pricing_jobs.card_print_id=9.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=269, set_code_classification.set_code=1.

### swsh12.5 -> swsh12pt5

- Card ownership: canonical=167, alias=0, overlap=0.
- Unique identity keys: canonical=160, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=475, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=167, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=7, card_print_identity.card_print_id=160, card_print_price_curves.card_print_id=5, card_print_traits.card_print_id=160, card_printings.card_print_id=272, ebay_active_price_snapshots.card_print_id=5, ebay_active_prices_latest.card_print_id=5, external_discovery_candidates.card_print_id=158, external_mappings.card_print_id=475, justtcg_variant_price_snapshots.card_print_id=2601, justtcg_variant_prices_latest.card_print_id=1036, justtcg_variants.card_print_id=1036, pricing_jobs.card_print_id=9.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: apps/web/src/app/explore/page.tsx; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=546, set_code_classification.set_code=1.

### sm75 -> sm7.5

- Card ownership: canonical=78, alias=0, overlap=0.
- Unique identity keys: canonical=78, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=220, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=78, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: card_print_identity.card_print_id=78, card_print_price_curves.card_print_id=7, card_print_traits.card_print_id=78, card_printings.card_print_id=234, ebay_active_price_snapshots.card_print_id=7, ebay_active_prices_latest.card_print_id=7, external_discovery_candidates.card_print_id=74, external_mappings.card_print_id=220, justtcg_variant_price_snapshots.card_print_id=1368, justtcg_variant_prices_latest.card_print_id=552, justtcg_variants.card_print_id=552, pricing_jobs.card_print_id=10.
- Metadata preservation required: printed_total, printed_set_abbrev, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: backend/identity/phase2a_canonical_promotion_numeric_only_apply_v1.mjs, backend/identity/sm75_alias_collapse_apply_v1.mjs, backend/identity/sm75_identity_audit_v1.mjs; alias code appears in set_code columns/views: card_prints_backup_20251115.set_code=78, import_image_errors.set_code=468, set_code_classification.set_code=1, v_promotion_umbrella_preflight_v1.set_code=1.

### hsp -> hgssp

- Card ownership: canonical=25, alias=0, overlap=0.
- Unique identity keys: canonical=25, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=25, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=25.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: card_feed_events.card_print_id=1, card_print_identity.card_print_id=25, card_print_price_curves.card_print_id=3, card_print_traits.card_print_id=25, card_printings.card_print_id=25, ebay_active_price_snapshots.card_print_id=3, ebay_active_prices_latest.card_print_id=3, external_mappings.card_print_id=25, pricing_jobs.card_print_id=4.
- Metadata preservation required: printed_total, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: backend/identity/hgssp_alias_collapse_apply_v1.mjs, backend/identity/remaining_identity_surface_global_audit_v1.mjs, backend/identity/remaining_identity_surface_global_audit_v2.mjs; alias code appears in set_code columns/views: card_prints_backup_20251115.set_code=24, import_image_errors.set_code=48, set_code_classification.set_code=1, v_promotion_umbrella_preflight_v1.set_code=1.

### sv09 -> sv9

- Card ownership: canonical=198, alias=0, overlap=0.
- Unique identity keys: canonical=190, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=388, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=198, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=8, card_print_identity.card_print_id=190, card_print_price_curves.card_print_id=15, card_print_traits.card_print_id=190, card_printings.card_print_id=339, ebay_active_price_snapshots.card_print_id=15, ebay_active_prices_latest.card_print_id=13, external_mappings.card_print_id=388, justtcg_variant_price_snapshots.card_print_id=2601, justtcg_variant_prices_latest.card_print_id=1025, justtcg_variants.card_print_id=1025, pricing_jobs.card_print_id=14, pricing_watch.card_print_id=36, shared_cards.card_id=1, vault_item_instances.card_print_id=69, vault_items.card_id=38.
- Metadata preservation required: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: backend/printing/run_version_finish_interpreter_v1.mjs; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=855, set_code_classification.set_code=1.

### base6 -> lc

- Card ownership: canonical=110, alias=0, overlap=0.
- Unique identity keys: canonical=110, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=324, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=110, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: card_price_ticks.card_print_id=110, card_prices.card_print_id=110, card_print_identity.card_print_id=110, card_print_price_curves.card_print_id=8, card_print_traits.card_print_id=110, card_printings.card_print_id=223, ebay_active_price_snapshots.card_print_id=8, ebay_active_prices_latest.card_print_id=8, external_discovery_candidates.card_print_id=108, external_mappings.card_print_id=324, justtcg_variant_price_snapshots.card_print_id=2739, justtcg_variant_prices_latest.card_print_id=1076, justtcg_variants.card_print_id=1076, pricing_jobs.card_print_id=12, pricing_watch.card_print_id=1, vault_item_instances.card_print_id=1, vault_items.card_id=1.
- Metadata preservation required: printed_total, printed_set_abbrev, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: apps/web/src/app/layout.tsx, apps/web/src/components/compare/CompareTray.tsx, apps/web/src/components/layout/MobileBottomNav.tsx, apps/web/src/components/pricing/PricingProjectionSummary.tsx, apps/web/src/components/slabs/AddSlabCardAction.tsx, backend/identity/lc_alias_collapse_apply_v1.mjs, backend/identity/lc_identity_audit_v1.mjs, backend/identity/phase2a_canonical_promotion_numeric_only_apply_v1.mjs...; alias code appears in set_code columns/views: card_prints_backup_20251115.set_code=110, set_code_classification.set_code=1, tcgdex_set_audit.set_code=1, v_promotion_umbrella_preflight_v1.set_code=1.

### me01 -> me1

- Card ownership: canonical=300, alias=0, overlap=0.
- Unique identity keys: canonical=271, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=592, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=300, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=29, card_embeddings.card_print_id=188, card_fingerprint_index.card_print_id=188, card_print_identity.card_print_id=164, card_print_price_curves.card_print_id=35, card_print_traits.card_print_id=188, card_printings.card_print_id=497, ebay_active_price_snapshots.card_print_id=35, ebay_active_prices_latest.card_print_id=27, external_discovery_candidates.card_print_id=188, external_mappings.card_print_id=592, justtcg_variant_price_snapshots.card_print_id=2329, justtcg_variant_prices_latest.card_print_id=887, justtcg_variants.card_print_id=887, pricing_jobs.card_print_id=60, pricing_watch.card_print_id=10, scanner_fingerprint_index.card_print_id=1621, shared_cards.card_id=6, vault_item_instances.card_print_id=10, vault_items.card_id=10.
- Metadata preservation required: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=310, set_code_classification.set_code=1.

### sv03 -> sv3

- Card ownership: canonical=237, alias=0, overlap=0.
- Unique identity keys: canonical=230, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=466, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=237, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=7, card_feed_events.card_print_id=1, card_interactions.card_print_id=4, card_print_price_curves.card_print_id=21, card_print_traits.card_print_id=230, card_printings.card_print_id=415, card_signals.card_print_id=4, ebay_active_price_snapshots.card_print_id=21, ebay_active_prices_latest.card_print_id=21, external_discovery_candidates.card_print_id=5, external_mappings.card_print_id=466, justtcg_variant_price_snapshots.card_print_id=3729, justtcg_variant_prices_latest.card_print_id=1429, justtcg_variants.card_print_id=1429, pricing_jobs.card_print_id=31, pricing_watch.card_print_id=20, shared_cards.card_id=1, slab_certs.card_print_id=3, vault_item_instances.card_print_id=33, vault_items.card_id=26.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: apps/web/src/app/explore/page.tsx; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=1218, set_code_classification.set_code=1.

### sv04 -> sv4

- Card ownership: canonical=292, alias=0, overlap=0.
- Unique identity keys: canonical=266, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=826, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=292, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=26, card_feed_events.card_print_id=1, card_print_identity.card_print_id=266, card_print_price_curves.card_print_id=14, card_print_traits.card_print_id=266, card_printings.card_print_id=403, ebay_active_price_snapshots.card_print_id=14, ebay_active_prices_latest.card_print_id=14, external_discovery_candidates.card_print_id=2, external_mappings.card_print_id=826, justtcg_variant_price_snapshots.card_print_id=4129, justtcg_variant_prices_latest.card_print_id=1598, justtcg_variants.card_print_id=1598, pricing_jobs.card_print_id=22, pricing_watch.card_print_id=12, vault_item_instances.card_print_id=22, vault_items.card_id=12.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: apps/web/src/app/explore/page.tsx, backend/identity/paf_realignment_apply_v1.mjs, backend/identity/paf_realignment_apply_v2.mjs, backend/identity/sv04pt5_canonical_promotion_apply_v1.mjs, backend/warehouse/prize_pack_evidence_v12_nonblocked.mjs, backend/warehouse/prize_pack_evidence_v13_nonblocked.mjs, backend/warehouse/prize_pack_evidence_v14_nonblocked.mjs, backend/warehouse/prize_pack_ready_batch_v13_nonblocked.mjs; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=1053, set_code_classification.set_code=1.

### me02 -> me2

- Card ownership: canonical=131, alias=0, overlap=0.
- Unique identity keys: canonical=130, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=259, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=131, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=1, card_embeddings.card_print_id=130, card_fingerprint_index.card_print_id=130, card_interactions.card_print_id=3, card_print_price_curves.card_print_id=18, card_print_traits.card_print_id=130, card_printings.card_print_id=218, card_signals.card_print_id=3, ebay_active_price_snapshots.card_print_id=18, ebay_active_prices_latest.card_print_id=18, external_discovery_candidates.card_print_id=127, external_mappings.card_print_id=259, justtcg_variant_price_snapshots.card_print_id=1602, justtcg_variant_prices_latest.card_print_id=584, justtcg_variants.card_print_id=584, pricing_jobs.card_print_id=29, pricing_watch.card_print_id=11, scanner_fingerprint_index.card_print_id=1128, shared_cards.card_id=7, vault_item_instances.card_print_id=12, vault_items.card_id=12.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in set_code columns/views: set_code_classification.set_code=1.

### sv01 -> sv1

- Card ownership: canonical=283, alias=0, overlap=0.
- Unique identity keys: canonical=258, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=847, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=283.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=25, card_print_price_curves.card_print_id=21, card_print_traits.card_print_id=258, card_printings.card_print_id=428, ebay_active_price_snapshots.card_print_id=21, ebay_active_prices_latest.card_print_id=21, external_discovery_candidates.card_print_id=48, external_mappings.card_print_id=847, justtcg_variant_price_snapshots.card_print_id=4307, justtcg_variant_prices_latest.card_print_id=1674, justtcg_variants.card_print_id=1674, pricing_jobs.card_print_id=22, pricing_watch.card_print_id=2, vault_item_instances.card_print_id=1, vault_items.card_id=1.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: backend/identity/identity_slot_audit_v1.test.mjs, backend/identity/phase2a_canonical_promotion_numeric_only_apply_v1.mjs, backend/identity/print_identity_key_number_recovery_apply_v1.mjs, backend/identity/print_identity_key_shadow_row_reuse_apply_v1.mjs, backend/warehouse/prize_pack_evidence_v12_nonblocked.mjs, backend/warehouse/prize_pack_evidence_v13_nonblocked.mjs, backend/warehouse/prize_pack_evidence_v14_nonblocked.mjs, backend/warehouse/prize_pack_evidence_v15_nonblocked.mjs...; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=438, set_code_classification.set_code=1.

### swsh4.5 -> swsh45

- Card ownership: canonical=75, alias=0, overlap=0.
- Unique identity keys: canonical=75, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=215, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=75, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: card_print_identity.card_print_id=73, card_print_price_curves.card_print_id=3, card_print_traits.card_print_id=73, card_printings.card_print_id=123, ebay_active_price_snapshots.card_print_id=3, ebay_active_prices_latest.card_print_id=3, external_discovery_candidates.card_print_id=72, external_mappings.card_print_id=215, justtcg_variant_price_snapshots.card_print_id=1147, justtcg_variant_prices_latest.card_print_id=472, justtcg_variants.card_print_id=472, pricing_jobs.card_print_id=5.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: apps/web/src/lib/setAccentColors.ts, backend/identity/remaining_identity_surface_global_audit_v1.mjs, backend/identity/remaining_identity_surface_global_audit_v2.mjs, backend/identity/swsh45sv_family_collapse_apply_v1.mjs, backend/identity/swsh45_refined_split_audit_v1.mjs; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=238, set_code_classification.set_code=1.

### sm3.5 -> sm35

- Card ownership: canonical=78, alias=0, overlap=0.
- Unique identity keys: canonical=78, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=230, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=78, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: card_print_identity.card_print_id=78, card_print_price_curves.card_print_id=9, card_print_traits.card_print_id=78, card_printings.card_print_id=234, ebay_active_price_snapshots.card_print_id=9, ebay_active_prices_latest.card_print_id=9, external_mappings.card_print_id=230, justtcg_variant_price_snapshots.card_print_id=1530, justtcg_variant_prices_latest.card_print_id=599, justtcg_variants.card_print_id=599, pricing_jobs.card_print_id=13, pricing_watch.card_print_id=1, vault_item_instances.card_print_id=2, vault_items.card_id=1.
- Metadata preservation required: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=554.

### sv07 -> sv7

- Card ownership: canonical=194, alias=0, overlap=0.
- Unique identity keys: canonical=175, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=369, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=194, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=19, card_print_identity.card_print_id=175, card_print_price_curves.card_print_id=15, card_print_traits.card_print_id=175, card_printings.card_print_id=300, ebay_active_price_snapshots.card_print_id=15, ebay_active_prices_latest.card_print_id=14, external_mappings.card_print_id=369, justtcg_variant_price_snapshots.card_print_id=2457, justtcg_variant_prices_latest.card_print_id=966, justtcg_variants.card_print_id=966, pricing_jobs.card_print_id=25, pricing_watch.card_print_id=1, shared_cards.card_id=1, vault_item_instances.card_print_id=1, vault_items.card_id=1.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=900, set_code_classification.set_code=1.

### sv08 -> sv8

- Card ownership: canonical=271, alias=0, overlap=0.
- Unique identity keys: canonical=252, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=775, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=271, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=19, card_feed_events.card_print_id=1, card_interaction_outcomes.card_print_id=1, card_interactions.card_print_id=4, card_print_identity.card_print_id=252, card_print_price_curves.card_print_id=12, card_print_traits.card_print_id=252, card_printings.card_print_id=417, card_signals.card_print_id=4, ebay_active_price_snapshots.card_print_id=12, ebay_active_prices_latest.card_print_id=12, external_mappings.card_print_id=775, justtcg_variant_price_snapshots.card_print_id=3433, justtcg_variant_prices_latest.card_print_id=1330, justtcg_variants.card_print_id=1330, pricing_jobs.card_print_id=20, pricing_watch.card_print_id=50, shared_cards.card_id=2, vault_item_instances.card_print_id=119, vault_items.card_id=53.
- Metadata preservation required: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: apps/web/src/app/explore/page.tsx, apps/web/src/lib/publicSets.shared.ts, apps/web/src/lib/setAccentColors.ts, backend/printing/output/premium_reconciliation_apply_plan_v1.md, backend/printing/output/premium_reconciliation_audit_v1.md, backend/printing/run_candidate_classification_pass_v1.mjs, backend/printing/run_justtcg_candidate_audit_v1.mjs, backend/printing/run_premium_authority_match_audit_v1.mjs...; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=8077, set_code_classification.set_code=1.

### sv05 -> sv5

- Card ownership: canonical=246, alias=0, overlap=0.
- Unique identity keys: canonical=218, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=464, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=246, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=28, card_print_price_curves.card_print_id=16, card_print_traits.card_print_id=218, card_printings.card_print_id=384, ebay_active_price_snapshots.card_print_id=16, ebay_active_prices_latest.card_print_id=16, external_mappings.card_print_id=464, justtcg_variant_price_snapshots.card_print_id=3321, justtcg_variant_prices_latest.card_print_id=1252, justtcg_variants.card_print_id=1252, pricing_jobs.card_print_id=27, pricing_watch.card_print_id=9, vault_item_instances.card_print_id=15, vault_items.card_id=8.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=1076, set_code_classification.set_code=1.

### sv06 -> sv6

- Card ownership: canonical=255, alias=0, overlap=0.
- Unique identity keys: canonical=226, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=707, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=255, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=29, card_feed_events.card_print_id=3, card_print_identity.card_print_id=226, card_print_price_curves.card_print_id=14, card_print_traits.card_print_id=226, card_printings.card_print_id=373, ebay_active_price_snapshots.card_print_id=14, ebay_active_prices_latest.card_print_id=14, external_mappings.card_print_id=707, justtcg_variant_price_snapshots.card_print_id=3308, justtcg_variant_prices_latest.card_print_id=1291, justtcg_variants.card_print_id=1291, pricing_jobs.card_print_id=18, pricing_watch.card_print_id=3, vault_item_instances.card_print_id=6, vault_items.card_id=3.
- Metadata preservation required: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in repo files: backend/warehouse/prize_pack_evidence_v10_nonblocked.mjs, backend/warehouse/prize_pack_evidence_v12_nonblocked.mjs, backend/warehouse/prize_pack_evidence_v14_nonblocked.mjs, backend/warehouse/prize_pack_ready_batch_v10.mjs, backend/warehouse/prize_pack_ready_batch_v12.mjs; alias code appears in set_code columns/views: _import_card_prints.set_code=226, price_observations_backup_20251115.set_code=1119, set_code_classification.set_code=1.

### sv10.5w -> rsv10pt5

- Card ownership: canonical=177, alias=0, overlap=0.
- Unique identity keys: canonical=173, alias=0.
- Orphan risk: low_alias_card_orphan_risk.
- External mappings: canonical=350, alias=0.
- External printing mappings: canonical=0, alias=0.
- Set FK dependencies on canonical side: card_prints.set_id=177, justtcg_set_mappings.grookai_set_id=1.
- Set FK dependencies on alias side: none.
- Card-print FK dependencies on canonical side: canon_warehouse_candidates.promoted_card_print_id=4, card_print_price_curves.card_print_id=12, card_print_traits.card_print_id=173, card_printings.card_print_id=519, ebay_active_price_snapshots.card_print_id=12, ebay_active_prices_latest.card_print_id=12, external_mappings.card_print_id=350, justtcg_variant_price_snapshots.card_print_id=1856, justtcg_variant_prices_latest.card_print_id=723, justtcg_variants.card_print_id=723, pricing_jobs.card_print_id=20.
- Metadata preservation required: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- Public/API route risk: set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views; alias row has metadata; preserve as redirect/search alias; alias code appears in set_code columns/views: price_observations_backup_20251115.set_code=1014, set_code_classification.set_code=1.

## Public/API Dependency Surface

Mapping tables audited: `external_mappings`, `external_printing_mappings`, and `justtcg_set_mappings`. Other mapping/provenance-like card dependencies were discovered through card-print FK introspection and are listed per pair.

Set-code based DB surfaces found during discovery include:

- Views with set-code dependencies: `card_prints_clean`, `card_prints_public`, `v_card_images`, `v_card_prices_usd`, `v_card_prints`, `v_card_prints_badges`, `v_card_prints_canon`, `v_card_prints_noncanon`, `v_card_prints_web_v1`, `v_card_search`, `v_card_stream_v1`, `v_cards_search_v2`, `v_condition_snapshot_analyses_match_card_v1`, `v_image_coverage_canon`, `v_image_coverage_noncanon`, `v_latest_price_by_card`, `v_latest_price_pref`, `v_pokemonapi_contract_audit`, `v_promotion_umbrella_preflight_v1`, `v_recently_added`, `v_section_cards_v1`, `v_sets_display`, `v_special_set_code_forks`, `v_special_set_print_membership`, `v_special_set_raw_counts`, `v_special_set_reconstruction_gate`, `v_tcgdex_contract_audit`, `v_ticker_24h`, `v_vault_items`, `v_vault_items_ext`, `v_vault_items_web`, `v_wall_cards_v1`, `v_wishlist_items`.
- Functions with set-code dependencies: `card_comments_set_insert_defaults_v1`, `card_feed_events_set_insert_defaults_v1`, `card_history`, `card_print_identity_backfill_projection_v1`, `card_print_identity_hash_v1`, `card_print_identity_select_set_code_v1`, `card_print_identity_serialize_key_v1`, `card_prints_assign_set_identity_model`, `fill_price_obs_print_id`, `gv_condition_analysis_failures_set_auth_uid`, `gv_condition_snapshot_analyses_set_auth_uid`, `gv_condition_snapshots_set_auth_uid`, `gv_identity_scan_event_results_set_auth_uid`, `gv_identity_scan_events_set_auth_uid`, `gv_identity_scan_selections_set_auth_uid`, `list_missing_price_sets`, `list_set_codes`, `propagate_set_identity_model_to_card_prints`, `public_vault_instance_detail_v1`, `resolve_set_identity_model`, `rpc_set_item_condition`, `search_card_prints_v1`, `search_card_prints_v1`, `search_cards_in_set`, `set_auth_uid`, `set_timestamp_updated_at`, `set_vault_item_condition`, `set_vault_item_grade`, `top_movers_24h`, `trg_canon_warehouse_set_updated_at_v1`, `vault_item_set_image_mode`, `vault_item_set_user_photo`, `vault_item_set_user_photo`, `vault_mobile_collector_rows_v1`, `vault_mobile_instance_detail_v1`.

Local code search also found historical set-code literals in identity and audit workers. This supports a permanent alias/source-routing layer instead of deleting alias rows or pretending aliases never existed.

## Safe-looking alias candidates

- `sv03.5` canonical candidate with `sv3pt5` as alias candidate.
- `sv10.5b` canonical candidate with `zsv10pt5` as alias candidate.
- `swsh3.5` canonical candidate with `swsh35` as alias candidate.
- `swsh12.5` canonical candidate with `swsh12pt5` as alias candidate.
- `sm75` canonical candidate with `sm7.5` as alias candidate.
- `hsp` canonical candidate with `hgssp` as alias candidate.
- `sv09` canonical candidate with `sv9` as alias candidate.
- `base6` canonical candidate with `lc` as alias candidate.
- `me01` canonical candidate with `me1` as alias candidate.
- `sv03` canonical candidate with `sv3` as alias candidate.
- `sv04` canonical candidate with `sv4` as alias candidate.
- `me02` canonical candidate with `me2` as alias candidate.
- `sv01` canonical candidate with `sv1` as alias candidate.
- `swsh4.5` canonical candidate with `swsh45` as alias candidate.
- `sm3.5` canonical candidate with `sm35` as alias candidate.
- `sv07` canonical candidate with `sv7` as alias candidate.
- `sv08` canonical candidate with `sv8` as alias candidate.
- `sv05` canonical candidate with `sv5` as alias candidate.
- `sv06` canonical candidate with `sv6` as alias candidate.
- `sv10.5w` canonical candidate with `rsv10pt5` as alias candidate.


## Metadata-only alias rows

- `sv3pt5`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `zsv10pt5`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `swsh35`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `swsh12pt5`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `sm7.5`: printed_total, printed_set_abbrev, identity_domain_default, identity_model, source.
- `hgssp`: printed_total, identity_domain_default, identity_model, source.
- `sv9`: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `lc`: printed_total, printed_set_abbrev, identity_domain_default, identity_model, source.
- `me1`: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `sv3`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `sv4`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `me2`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `sv1`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `swsh45`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `sm35`: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `sv7`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `sv8`: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `sv5`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `sv6`: release_date, logo_url, symbol_url, identity_domain_default, identity_model, source.
- `rsv10pt5`: release_date, printed_total, printed_set_abbrev, logo_url, symbol_url, identity_domain_default, identity_model, source.


## Route-preservation candidates

- `sv3pt5` should remain available as a redirect/search/source alias for `sv03.5`.
- `zsv10pt5` should remain available as a redirect/search/source alias for `sv10.5b`.
- `swsh35` should remain available as a redirect/search/source alias for `swsh3.5`.
- `swsh12pt5` should remain available as a redirect/search/source alias for `swsh12.5`.
- `sm7.5` should remain available as a redirect/search/source alias for `sm75`.
- `hgssp` should remain available as a redirect/search/source alias for `hsp`.
- `sv9` should remain available as a redirect/search/source alias for `sv09`.
- `lc` should remain available as a redirect/search/source alias for `base6`.
- `me1` should remain available as a redirect/search/source alias for `me01`.
- `sv3` should remain available as a redirect/search/source alias for `sv03`.
- `sv4` should remain available as a redirect/search/source alias for `sv04`.
- `me2` should remain available as a redirect/search/source alias for `me02`.
- `sv1` should remain available as a redirect/search/source alias for `sv01`.
- `swsh45` should remain available as a redirect/search/source alias for `swsh4.5`.
- `sm35` should remain available as a redirect/search/source alias for `sm3.5`.
- `sv7` should remain available as a redirect/search/source alias for `sv07`.
- `sv8` should remain available as a redirect/search/source alias for `sv08`.
- `sv5` should remain available as a redirect/search/source alias for `sv05`.
- `sv6` should remain available as a redirect/search/source alias for `sv06`.
- `rsv10pt5` should remain available as a redirect/search/source alias for `sv10.5w`.


## Blocked alias candidates

_None discovered among the 20 alias-candidate groups._


## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No merge operations.
- No alias changes.
- No migration repair.
- No `db pull`.
- No production mutation.

