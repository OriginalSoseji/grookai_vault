# GROOKAI_BETA_HARDENING_READINESS_V1

Generated: 2026-06-24T20:30:32.144Z

## Summary

- Launch posture: beta_ready_with_ranked_followups
- Top blocker: No launch blockers remain in the current evidence set.
- Mode: read_only_repo_artifact_consolidation_no_db_no_storage_no_migration_no_pricing_no_ai

## Scope

- Read-only consolidation only.
- Explicit non-scope: db_writes, migrations, image_uploads, pointer_repoints, pricing, japanese, ai_expansion

## Lane Status

- Image coverage: parent_coverage_clear; English physical parent image gaps = 0; child image field gaps = 43079.
- Surface parity: live_curated_scan_clear_candidate_scans_empty; curated live routes scanned = 5; curated failures = 0; DB-derived card detail routes scanned = 0; DB-derived Dex routes scanned = 0.
- Promo origin coverage: covered_after_03c_exact_export; family rows added = 1523; exact rows added = 4.
- Search contract health: selected_contract_tests_passed; normal Search AI model calls allowed = false.
- Mobile parity: synced; web/mobile payload hashes match = true.
- Production smoke: sampled_live_image_routes_clear; live routes checked = 11; live failures = 0.
- Base Set print-run lanes: representative_pointer_gap_closed; updated rows = 304; current missing after final scan = 0.
- World Championship rows: rows_complete_for_beta_display; sets = 80; deck card quantity sum = 4800.

## Launch Blockers


## Followups

1. P2 enrichment backlog - Exact image completeness: not_launch_blocking_if_representative_labeling_remains_visible. English physical parent rows have no missing image-field gaps. Remaining exact-image gap is quality of truth: representative rows still need exact acquisition over time.
2. P2 regression guard - Promo origin public copy: covered. Family-level promo copy and the four previously excluded source-backed rows are exported. Pre-export readiness still records the old four-row gap, so use the 03C exact export as current truth.

## Cleared Checks

- Live sampled image runtime smoke is clear for 11 routes on https://grookaivault.com.
- Non-empty live curated fallback scan is clear for Dex, card detail, and set detail.
- Selected deterministic search, AI boundary, promo origin, image parity, Base Set, and World Championship decklist contracts passed.
- Web/mobile variant origin generated payloads are synced.

## Evidence

- imageFinal: docs/audits/image_truth_v1/self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.json
- imageRuntime: docs/audits/image_truth_v1/image_truth_img21a_runtime_surface_smoke_v1.json
- dexRuntime: docs/audits/image_truth_v1/image_truth_img23a_dex_child_fallback_runtime_scan_v1.json
- cardRuntime: docs/audits/image_truth_v1/image_truth_img23b_card_detail_child_fallback_runtime_scan_v1.json
- promoReadiness: docs/audits/master_index_promo_origin_v1/master_index_promo_origin_03a_public_copy_readiness_summary_v1.json
- promoFamily: docs/audits/master_index_promo_origin_v1/master_index_promo_origin_03b_family_public_copy_export_summary_v1.json
- promoExact: docs/audits/master_index_promo_origin_v1/master_index_promo_origin_03c_exact_public_copy_export_summary_v1.json
- baseSetApply: docs/audits/base_set_print_run_lanes_v1/base_set_print_run_lanes_representative_parent_image_pointer_apply_result_v1.json
- worldChampSmoke: docs/audits/master_index_world_championship_decks_v1/world_championship_decks_09f_runtime_search_smoke_v1.json
- worldChampLiveSmoke: docs/audits/master_index_world_championship_decks_v1/world_championship_decks_09g_live_prod_smoke_v1.json
- curatedFallbackLiveScan: docs/audits/image_truth_v1/image_truth_img24a_curated_fallback_live_scan_v1.json
- webVariantOrigin: apps/web/src/lib/cards/variantOriginPublicCopy.generated.json
- mobileVariantOrigin: lib/services/identity/variant_origin_public_copy_generated.dart

## Verification

- Contract command run outside this report: `node --test tests/contracts/grookai_ai_search_boundary_v1.test.mjs tests/contracts/promo_origin_public_copy_v1.test.mjs tests/contracts/image_surface_consistency_v1.test.mjs tests/contracts/base_set_print_run_lanes_contract_v1.test.mjs tests/contracts/base_set_print_run_lanes_web_parity_v1.test.mjs tests/contracts/world_championship_decklist_public_surface.test.mjs`
- Report fingerprint: 022f688d9aedfd279361d7abd58bba2b906a9ce74ab2f626af5e6b812eaed307
