# Prize Pack Repo Cleanup Audit V1

Generated: 2026-04-22T04:58:31.617Z

## Scope

This audit classified the current working tree for the Prize Pack milestone. It did not run backlog workers, write to DB, mutate canon, promote rows, map rows, write images, delete files, or move files.

## Inventory Summary

| Bucket | Count |
| --- | ---: |
| RUNTIME_CORE_CHANGES | 9 |
| RUNTIME_NEW_FILES | 52 |
| DOCS_CONTRACTS | 15 |
| DOCS_CHECKPOINTS | 231 |
| DOCS_PLAYBOOKS | 5 |
| WORKER_READMES | 16 |
| TEST_FILES | 6 |
| MIGRATIONS | 1 |
| POSSIBLE_MISPLACED_FILES | 6 |
| POSSIBLE_DUPLICATE_OR_SUPERSEDED_FILES | 5 |
| FILES_REQUIRING_HUMAN_DECISION | 1 |

Full path-level inventory is in `docs/checkpoints/warehouse/prize_pack_repo_cleanup_audit_v1.json`.

## Misplaced Or Suspicious Files

- `backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs` -> CORRECT_LOCATION: Executable writes JustTCG/external mapping data and matches existing backend/pricing mapping-worker convention. Prize Pack ready-batch scripts reference this path directly.
- `backend/warehouse/promote_source_backed_justtcg_mapping_v1.README.md` -> CORRECT_LOCATION: README was requested with warehouse worker docs because Prize Pack batch closure calls the pricing worker from the warehouse flow. The README explicitly documents the executable path under backend/pricing.
- `backend/identity/identity_slot_audit_v1.mjs` -> CORRECT_LOCATION: Identity-slot audit is read-only identity-domain logic and belongs under backend/identity.
- `backend/identity/identity_slot_audit_v1.README.md` -> CORRECT_LOCATION: README is colocated with its identity executable.
- `backend/warehouse/import_prize_pack_official_checklists_v1.py` -> CORRECT_LOCATION: One-purpose source acquisition normalizer writes warehouse checkpoint JSON and is scoped to Prize Pack warehouse evidence.
- `supabase/migrations/20260417100000__warehouse_identity_reconciliation_v1.sql` -> CORRECT_LOCATION_SEPARATE_COMMIT: Migration path and naming match repo convention. It is schema work and should not be bundled with docs or runtime-only commits.

No moves were performed. The only suspicious-looking placement is the warehouse README for the pricing mapping worker, and it is intentionally a documentation shim.

## Duplicate Or Superseded Artifacts

### SUPERSEDED_BUT_KEEP

Failed/direct Series 2 acquisition attempts are superseded by the official fallback acquisition, but they document why the fallback path was needed.

- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1_series_2.json`
- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1_series_2.md`
- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1_series_2_real_browser_required.json`
- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1_series_2_real_browser_required.md`

### KEEP_HISTORICAL

Candidate files are exact input manifests proving bounded READY batch execution. Closure files supersede them operationally but do not replace them historically.

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v10_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v11_nonblocked_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v12_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v13_nonblocked_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v18_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v19_nonblocked_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v20_nonblocked_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v4_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v5_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v6_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v6_nonblocked_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v7_nonblocked_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v7_source_upgrade_series_2_candidate.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v8_nonblocked_candidate.json`

### KEEP_HISTORICAL

Evidence input and target-slice artifacts prove how each bounded slice was selected.

- `docs/checkpoints/warehouse/prize_pack_evidence_v10_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v10_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v11_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v11_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v12_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v12_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v13_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v13_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v14_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v14_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v15_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v15_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v16_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v16_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v17_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v17_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v18_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v18_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v19_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v19_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v20_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v20_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v21_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v21_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v22_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v22_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v3_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v3_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v4_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v4_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v5_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v5_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v6_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v6_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v7_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v7_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v8_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v8_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v9_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v9_nonblocked_target_slice.json`

### KEEP_HISTORICAL

Route repair input, cluster, and target-cluster artifacts are needed to reproduce structural repair decisions.

- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v1_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_clusters.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_target_cluster.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v3_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v3_target_cluster.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v4_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v4_target_cluster.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v6_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v6_target_cluster.json`

### KEEP_HISTORICAL

Subset and residue files document bounded partial closure and should not be removed without a separate artifact-retention policy.

- `docs/checkpoints/warehouse/prize_pack_ready_batch_v1_129_promoted_subset.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v1_129_residue_2.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v2_72_promoted_subset.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v6_nonblocked_promoted_subset.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v6_residue_5.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v7_nonblocked_promoted_subset.json`

No file is classified as `SAFE_TO_REMOVE`. Default action is keep historical artifacts.

## Migration Status

- Path: `supabase/migrations/20260417100000__warehouse_identity_reconciliation_v1.sql`
- Classification: SEPARATE_COMMIT
- Reason: The file adds warehouse candidate identity audit columns and transition guard constraints. It is structurally related to the warehouse identity milestone, but it is schema work and should be committed separately from runtime, checkpoints, and docs. It was not changed by this cleanup pass.

## Files Requiring Human Decision

- `supabase/migrations/20260417100000__warehouse_identity_reconciliation_v1.sql`: Human should decide migration apply/staging timing. Intent is clear enough for SEPARATE_COMMIT classification, but schema deployment is operationally distinct from repo packaging.

## Commit Groups

### Commit Group A - Runtime / Identity / Warehouse code

Why: Runtime workers, helper modules, source acquisition scripts, mapping worker, and tests required by the warehouse/stamped/Prize Pack milestone behavior.

Safe commit message: `Add Prize Pack warehouse identity and evidence workers`

File count: 67

- `backend/identity/identity_resolution_v1.mjs`
- `backend/identity/identity_resolution_v1.test.mjs`
- `backend/identity/identity_slot_audit_v1.mjs`
- `backend/identity/identity_slot_audit_v1.test.mjs`
- `backend/identity/perfect_order_variant_identity_rule_v1.mjs`
- `backend/identity/perfect_order_variant_identity_rule_v1.test.mjs`
- `backend/identity/stamped_identity_rule_v1.mjs`
- `backend/identity/stamped_identity_rule_v1.test.mjs`
- `backend/identity/variant_coexistence_rule_v1.mjs`
- `backend/images/source_image_enrichment_worker_v1.mjs`
- `backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs`
- `backend/warehouse/buildCardPrintGvIdV1.mjs`
- `backend/warehouse/buildCardPrintGvIdV1.test.mjs`
- `backend/warehouse/classification_worker_v1.mjs`
- `backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs`
- `backend/warehouse/import_prize_pack_official_checklists_v1.py`
- `backend/warehouse/metadata_extraction_worker_v1.mjs`
- `backend/warehouse/missing_special_cases_audit_v1.mjs`
- `backend/warehouse/prize_pack_backlog_final_state_v1.mjs`
- `backend/warehouse/prize_pack_base_route_repair_v2.mjs`
- `backend/warehouse/prize_pack_base_route_repair_v3.mjs`
- `backend/warehouse/prize_pack_base_route_repair_v4.mjs`
- `backend/warehouse/prize_pack_base_route_repair_v5.mjs`
- `backend/warehouse/prize_pack_base_route_repair_v6.mjs`
- `backend/warehouse/prize_pack_evidence_corroboration_v1.mjs`
- `backend/warehouse/prize_pack_evidence_source_upgrade_v1.mjs`
- `backend/warehouse/prize_pack_evidence_v10_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v11_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v12_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v13_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v14_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v15_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v16_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v17_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v18_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v19_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v2.mjs`
- `backend/warehouse/prize_pack_evidence_v20_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v21_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v22_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v3.mjs`
- `backend/warehouse/prize_pack_evidence_v4.mjs`
- `backend/warehouse/prize_pack_evidence_v5.mjs`
- `backend/warehouse/prize_pack_evidence_v6_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v7_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v8_nonblocked.mjs`
- `backend/warehouse/prize_pack_evidence_v9_nonblocked.mjs`
- `backend/warehouse/prize_pack_ready_batch_v10.mjs`
- `backend/warehouse/prize_pack_ready_batch_v11_nonblocked.mjs`
- `backend/warehouse/prize_pack_ready_batch_v12.mjs`
- `backend/warehouse/prize_pack_ready_batch_v13_nonblocked.mjs`
- `backend/warehouse/prize_pack_ready_batch_v18_nonblocked.mjs`
- `backend/warehouse/prize_pack_ready_batch_v19_nonblocked.mjs`
- `backend/warehouse/prize_pack_ready_batch_v20_nonblocked.mjs`
- `backend/warehouse/prize_pack_ready_batch_v6_source_upgrade_series_1.mjs`
- `backend/warehouse/prize_pack_ready_batch_v7_source_upgrade_series_2.mjs`
- `backend/warehouse/prize_pack_ready_batch_v8_nonblocked.mjs`
- `backend/warehouse/prize_pack_series_2_source_upgrade_fallback_v1.mjs`
- `backend/warehouse/prize_pack_special_identity_family_repair_v1.mjs`
- `backend/warehouse/prize_pack_wait_inspection_v1.mjs`
- `backend/warehouse/promotion_executor_v1.mjs`
- `backend/warehouse/promotion_stage_worker_v1.mjs`
- `backend/warehouse/source_identity_contract_v1.mjs`
- `backend/warehouse/source_identity_contract_v1.test.mjs`
- `backend/warehouse/staging_reconciliation_v1.mjs`
- `backend/warehouse/stamped_identity_rule_apply_v1.mjs`
- `backend/warehouse/stamped_manual_review_clusters_v1.mjs`

### Commit Group B - Contracts and core docs

Why: Binding contract docs and contract index changes that govern the runtime behavior.

Safe commit message: `Document stamped identity and Prize Pack contracts`

File count: 15

- `docs/CONTRACT_INDEX.md`
- `docs/contracts/EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1.md`
- `docs/contracts/EVIDENCE_TIER_V1.md`
- `docs/contracts/EXPANSION_NAME_STAMP_OVERLAY_IDENTITY_RULE_V1.md`
- `docs/contracts/EXTERNAL_DISCOVERY_TO_WAREHOUSE_BRIDGE_V1.md`
- `docs/contracts/GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1.md`
- `docs/contracts/PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1.md`
- `docs/contracts/PRIZE_PACK_SERIES_MARKER_IDENTITY_RULE_V1.md`
- `docs/contracts/PROMO_FAMILY_IDENTITY_RULE_V1.md`
- `docs/contracts/PROMO_PREFIX_IDENTITY_RULE_V1.md`
- `docs/contracts/PROMO_SLOT_IDENTITY_RULE_V1.md`
- `docs/contracts/REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1.md`
- `docs/contracts/SET_CLOSURE_PLAYBOOK_V1.md`
- `docs/contracts/STAMPED_IDENTITY_RULE_V1.md`
- `docs/contracts/VARIANT_COEXISTENCE_RULE_V1.md`

### Commit Group C - Checkpoints / milestone artifacts

Why: Reproducible checkpoint chain, source imports, route repairs, evidence passes, ready batch closures, final state, and this cleanup audit.

Safe commit message: `Checkpoint Prize Pack backlog milestone state`

File count: 231

- `docs/checkpoints/identity/alias_mapping_execution_v1.md`
- `docs/checkpoints/identity/identity_audit_v1.md`
- `docs/checkpoints/identity/identity_resolution_v1.md`
- `docs/checkpoints/warehouse/bridge_generalization_v1.md`
- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1.json`
- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1.md`
- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1_series_2.json`
- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1_series_2.md`
- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1_series_2_real_browser_required.json`
- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1_series_2_real_browser_required.md`
- `docs/checkpoints/warehouse/missing_card_closure_v1.md`
- `docs/checkpoints/warehouse/missing_special_cases_audit_v1.json`
- `docs/checkpoints/warehouse/missing_special_cases_audit_v1.md`
- `docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.json`
- `docs/checkpoints/warehouse/prize_pack_backlog_final_state_v1.md`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v1.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v1.md`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v1_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v2.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v2.md`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_clusters.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v2_target_cluster.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v3.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v3.md`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v3_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v3_target_cluster.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v4.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v4.md`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v4_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v4_target_cluster.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v5.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v5.md`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v6.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v6.md`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v6_input.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v6_target_cluster.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_corroboration_v1.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_corroboration_v1.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_source_upgrade_v1_target.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v1.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v1.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v10.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v10.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v10_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v10_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v11_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v11_nonblocked.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v11_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v11_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v12_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v12_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v12_nonblocked.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v12_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v13_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v13_nonblocked.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v13_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v13_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v14_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v14_nonblocked.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v14_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v14_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v15_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v15_nonblocked.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v15_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v15_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v16_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v16_nonblocked.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v16_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v16_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v17_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v17_nonblocked.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v17_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v17_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v18_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v18_nonblocked.md`
- `docs/checkpoints/warehouse/prize_pack_evidence_v18_nonblocked_input.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v18_nonblocked_target_slice.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v19_nonblocked.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v19_nonblocked.md`
- ... 151 more paths in JSON audit

### Commit Group D - Playbook pack / worker READMEs

Why: Operational playbooks, machine-readable worker index, bucket definitions, source guide, and worker/family documentation.

Safe commit message: `Add Prize Pack backlog execution playbooks`

File count: 21

- `backend/identity/identity_slot_audit_v1.README.md`
- `backend/images/source_image_enrichment_worker_v1.README.md`
- `backend/warehouse/buildCardPrintGvIdV1.README.md`
- `backend/warehouse/classification_worker_v1.README.md`
- `backend/warehouse/external_discovery_to_warehouse_bridge_v1.README.md`
- `backend/warehouse/prize_pack_backlog_final_state_v1.README.md`
- `backend/warehouse/prize_pack_base_route_repair_family.README.md`
- `backend/warehouse/prize_pack_evidence_corroboration_v1.README.md`
- `backend/warehouse/prize_pack_evidence_family.README.md`
- `backend/warehouse/prize_pack_evidence_source_upgrade_v1.README.md`
- `backend/warehouse/prize_pack_ready_batch_family.README.md`
- `backend/warehouse/prize_pack_wait_inspection_v1.README.md`
- `backend/warehouse/promote_source_backed_justtcg_mapping_v1.README.md`
- `backend/warehouse/promotion_executor_v1.README.md`
- `backend/warehouse/source_identity_contract_v1.README.md`
- `backend/warehouse/stamped_manual_review_clusters_v1.README.md`
- `docs/playbooks/PRIZE_PACK_BACKLOG_BUCKET_DEFINITIONS_V1.md`
- `docs/playbooks/PRIZE_PACK_BACKLOG_DECISION_TREE_V1.md`
- `docs/playbooks/PRIZE_PACK_BACKLOG_EXECUTION_PLAYBOOK_V1.md`
- `docs/playbooks/PRIZE_PACK_SOURCE_ACQUISITION_GUIDE_V1.md`
- `docs/playbooks/PRIZE_PACK_WORKER_INDEX_V1.json`

### Commit Group E - Migration

Why: Schema migration is validly located but should remain a separate review and commit unit.

Safe commit message: `Add warehouse identity reconciliation migration`

File count: 1

- `supabase/migrations/20260417100000__warehouse_identity_reconciliation_v1.sql`

## Recommended Git Command Pack

### COMMIT A

```bash
git add -- backend/identity/*.mjs backend/identity/*.test.mjs backend/images/source_image_enrichment_worker_v1.mjs backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs backend/warehouse/*.mjs backend/warehouse/*.py backend/warehouse/*.test.mjs
git commit -m "Add Prize Pack warehouse identity and evidence workers"
```

### COMMIT B

```bash
git add -- docs/CONTRACT_INDEX.md docs/contracts
git commit -m "Document stamped identity and Prize Pack contracts"
```

### COMMIT C

```bash
git add -- docs/checkpoints/identity docs/checkpoints/warehouse
git commit -m "Checkpoint Prize Pack backlog milestone state"
```

### COMMIT D

```bash
git add -- docs/playbooks/PRIZE_PACK_BACKLOG_EXECUTION_PLAYBOOK_V1.md docs/playbooks/PRIZE_PACK_BACKLOG_DECISION_TREE_V1.md docs/playbooks/PRIZE_PACK_WORKER_INDEX_V1.json docs/playbooks/PRIZE_PACK_BACKLOG_BUCKET_DEFINITIONS_V1.md docs/playbooks/PRIZE_PACK_SOURCE_ACQUISITION_GUIDE_V1.md backend/warehouse/*.README.md backend/identity/identity_slot_audit_v1.README.md backend/images/source_image_enrichment_worker_v1.README.md
git commit -m "Add Prize Pack backlog execution playbooks"
```

### COMMIT E

```bash
git add -- supabase/migrations/20260417100000__warehouse_identity_reconciliation_v1.sql
git commit -m "Add warehouse identity reconciliation migration"
```

### Do Not Stage Yet / Inspect First

- Do not stage Commit E with A-D. Review migration apply timing first.
- Do not remove superseded checkpoint inputs/candidates; keep historical unless a separate retention policy is approved.

## Quality Gate

- Every changed path from `git status --porcelain=v1` is classified in the JSON audit.
- No moves were performed.
- No removals were performed.
- No files were classified `SAFE_TO_REMOVE`.
- Migration is isolated into its own commit group.
