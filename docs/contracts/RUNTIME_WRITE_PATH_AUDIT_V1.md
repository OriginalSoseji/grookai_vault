# RUNTIME_WRITE_PATH_AUDIT_V1

Status: Active audit support document

Purpose: coverage-accountable inventory of canon-affecting and ownership-affecting write paths before additional enforcement changes.

## Classification Key

- `runtime_status`
  - `enforced`: already behind a required shared boundary
  - `partial`: validation/proofs exist, but the path is still using ad hoc entrypoints
  - `owner_boundary_enforced`: ownership/trust write enters `execute_owner_write_v1.ts` and proves post-write invariants through the shared owner boundary
  - `bypass`: direct write path is outside the runtime boundary
- `contained_maintenance_authority`: explicit maintenance-only mutation lane; never part of normal runtime flows
- `partial_owner_boundary_enforced`: ownership/trust write enters `execute_owner_write_v1.ts` and proves post-write invariants, but the path still depends on compensated non-transactional or compatibility-tolerant behavior
- `unknown`: write surface was found but not yet audited deeply enough to trust
- `transaction_mode`
  - `transactional_authoritative`: write and proof can complete in one DB transaction
  - `compensated_non_transactional`: proof exists or can exist, but the write is not wrapped in one authoritative transaction
  - `non_transactional`: direct mutation path with no authoritative transaction boundary
  - `unknown`: transaction behavior was not safe to classify yet

## Canon-Affecting Write Paths

| path_name | source_files | canon_affecting | ownership_affecting | public_trust_affecting | runtime_status | transaction_mode | post_write_proof | risk_level | next_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `external_discovery_to_warehouse_bridge_v1` | `backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs` | yes | no | no | enforced | transactional_authoritative | yes | medium | Keep on the shared executor boundary; do not allow ad hoc RAW candidate writes back in. |
| `classification_apply_write_plan_v1` | `backend/warehouse/classification_worker_v1.mjs` | yes | no | no | enforced | transactional_authoritative | yes | medium | Keep candidate locking and evidence freshness checks inside the executor-backed boundary. |
| `classification_apply_reclassification_result_v1` | `backend/warehouse/classification_worker_v1.mjs` | yes | no | no | enforced | transactional_authoritative | yes | medium | Keep reclassification update + event append inside the executor-backed boundary. |
| `promotion_stage_create_stage_v1` | `backend/warehouse/promotion_stage_worker_v1.mjs` | yes | no | no | enforced | transactional_authoritative | yes | high | Keep the stage handoff on the shared executor; do not split proof authority back out. |
| `alias_mapping_execution_v1` | `backend/warehouse/promotion_executor_v1.mjs`, `backend/warehouse/staging_reconciliation_v1.mjs` | yes | no | no | enforced | transactional_authoritative | yes | high | Keep both executor and reconciliation alias callers on the shared executor path. |
| `promotion_executor_execute_claimed_stage_v1` | `backend/warehouse/promotion_executor_v1.mjs` | yes | no | no | enforced | transactional_authoritative | yes | high | Keep the highest-risk canon mutation lane behind the shared executor. |
| `gv_id_assignment_worker_v1` | `backend/warehouse/gv_id_assignment_worker_v1.mjs` | yes | no | yes | enforced | compensated_non_transactional | yes | medium | Keep compensated proof mode explicit until the architecture is ready for managed transactions. |
| `source_image_enrichment_worker_v1` | `backend/images/source_image_enrichment_worker_v1.mjs` | yes | no | yes | enforced | transactional_authoritative | yes | medium | Keep exact-image protection and representative-only writes on the shared executor. |
| `promote_source_backed_justtcg_mapping_v1` | `backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs` | yes | no | yes | enforced | compensated_non_transactional | yes | medium | Keep source/card conflict blocking deterministic through the shared executor. |
| `printing_upsert_v1` | `backend/printing/printing_upsert_v1.mjs` | yes | no | no | enforced | compensated_non_transactional | yes | low | Keep child-printing writes on the shared executor. |
| `staging_reconciliation_v1` | `backend/warehouse/staging_reconciliation_v1.mjs` | yes | no | no | intentionally blocked | unknown | no | high | Keep blocked. Direct writes were removed and execution is disabled until a runtime-safe rewrite can split reconciliation-only writes from alias execution reuse. |
| `controlled_growth_ingestion_worker_v1` | `backend/ingestion/controlled_growth_ingestion_worker_v1.mjs` | no | no | no | enforced | non_transactional | no | low | Keep out of canon runtime scope. This lane writes non-canonical raw discovery staging only. |
| `legacy_identity_apply_scripts` | `backend/identity/*apply*.mjs`, `backend/identity/*repair*.mjs`, `backend/identity/*migration*.mjs`, `backend/identity/*replay*.mjs` | yes | yes | yes | contained_maintenance_authority | unknown | no | high | Keep behind the explicit identity maintenance boundary. These replay/repair scripts now require explicit maintenance mode, the dedicated entrypoint, and dry-run-by-default execution until a dedicated replay architecture exists. |
| `canon_maintenance_replay_and_migration_helpers` | `backend/domain/domain_baseline_*.mjs`, `backend/ingestion/justtcg_*apply*.mjs`, `backend/infra/backfill_print_identity_worker.mjs`, `backend/pricing/{ba_promote_v1,ba_phase9_ba_canon_promote_v2,ba_phase9a_parent_verify_v1,promote_justtcg_direct_structure_mapping_v1,promote_tcgdex_bridge_to_justtcg_mapping_v1,promote_tcgplayer_to_justtcg_mapping_v1,justtcg_variant_prices_latest_refresh_v1,justtcg_variant_prices_latest_repair_v1}.mjs`, `supabase/migrations/*.sql`, `backend/maintenance/*.mjs` | yes | yes | yes | contained_maintenance_authority | unknown | no | high | Keep behind the explicit canon maintenance boundary. Canon replay/migration helpers are no longer live runtime bypasses; they now require explicit maintenance mode, the dedicated launcher, and dry-run-default execution. SQL migrations remain explicit operator-only schema maintenance. |

## Ownership / Trust Mutation Paths

| path_name | source_files | canon_affecting | ownership_affecting | public_trust_affecting | runtime_status | transaction_mode | post_write_proof | risk_level | next_action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `createWallSectionAction` | `apps/web/src/lib/wallSections/createWallSectionAction.ts` | no | yes | yes | partial | non_transactional | yes | medium | Keep exact-copy owner proof coverage; do not move section authority back to grouped compatibility surfaces. |
| `updateWallSectionAction` | `apps/web/src/lib/wallSections/updateWallSectionAction.ts` | no | yes | yes | partial | non_transactional | yes | medium | Keep exact-copy owner proof coverage on rename / activate flows. |
| `assignWallSectionMembershipAction` | `apps/web/src/lib/wallSections/assignWallSectionMembershipAction.ts` | no | yes | yes | partial | non_transactional | yes | medium | Keep exact-copy membership proof coverage; this is the authoritative wall-section owner lane. |
| `removeWallSectionMembershipAction` | `apps/web/src/lib/wallSections/removeWallSectionMembershipAction.ts` | no | yes | yes | partial | non_transactional | yes | medium | Keep exact-copy membership removal proof coverage. |
| `archiveVaultItemInstanceAction` | `apps/web/src/lib/vault/archiveVaultItemInstanceAction.ts`, `supabase/migrations/20260325114500_patch_vault_archive_exact_instance_v1.sql` | no | yes | yes | partial | transactional_authoritative | yes | medium | Keep post-RPC archive + count proofs until this lane can move behind a shared owner-write execution service. |
| `updateVaultItemQuantity` | `apps/web/src/lib/vault/updateVaultItemQuantity.ts` | no | yes | yes | partial | compensated_non_transactional | yes | medium | Keep increment/decrement exact-copy and count proofs. Full runtime routing remains deferred because compatibility mirroring is still tolerated. |
| `addCardToVault` | `apps/web/src/lib/vault/addCardToVault.ts` | no | yes | yes | partial | compensated_non_transactional | yes | medium | Keep created-instance proof coverage. Full runtime routing remains deferred because compatibility mirror failure is still tolerated. |
| `createSlabInstance` | `apps/web/src/lib/slabs/createSlabInstance.ts` | no | yes | yes | partial | compensated_non_transactional | yes | medium | Keep created-instance proof coverage; full runtime routing remains deferred until slab create/rollback is isolated behind one service boundary. |
| `slab_upgrade_route` | `apps/web/src/app/api/slabs/upgrade/route.ts` | no | yes | yes | partial | compensated_non_transactional | yes | medium | Keep slab create plus source archive on the owner-write boundary. Full transactional ownership execution remains deferred until this route can stop compensating across separate RPC/service steps. |
| `createCardInteractionAction` | `apps/web/src/lib/network/createCardInteractionAction.ts` | no | yes | yes | partial | non_transactional | yes | medium | Keep interaction create on the owner-write boundary with existence + signal proofs. Shared interaction validation is still duplicated with reply flow and should be consolidated later. |
| `replyToCardInteractionGroupAction` | `apps/web/src/lib/network/replyToCardInteractionGroupAction.ts` | no | yes | yes | partial | non_transactional | yes | medium | Keep interaction reply on the owner-write boundary with existence + signal proofs. Shared interaction validation is still duplicated with create flow and should be consolidated later. |
| `executeCardInteractionOutcomeAction` | `apps/web/src/lib/network/executeCardInteractionOutcomeAction.ts`, `supabase/migrations/20260324160000_p3_card_execution_layer_v1.sql` | no | yes | yes | partial | transactional_authoritative | yes | medium | Keep source-archive and target-active proofs until a dedicated owner-write execution service exists. |
| `saveVaultItemInstanceIntentAction` | `apps/web/src/lib/network/saveVaultItemInstanceIntentAction.ts` | no | yes | yes | partial | non_transactional | yes | low | Keep instance-intent round-trip proofs on the exact-copy authority row. |
| `saveVaultItemInstanceConditionAction` | `apps/web/src/lib/vault/saveVaultItemInstanceConditionAction.ts` | no | yes | no | owner_boundary_enforced | non_transactional | yes | medium | Keep exact-copy condition writes on the shared owner boundary with post-write condition proof. |
| `saveVaultItemInstanceMediaAction` | `apps/web/src/lib/vault/saveVaultItemInstanceMediaAction.ts` | no | yes | yes | owner_boundary_enforced | non_transactional | yes | medium | Keep exact-copy media writes on the shared owner boundary with path/source proof. |
| `saveVaultItemInstanceNotesAction` | `apps/web/src/lib/vault/saveVaultItemInstanceNotesAction.ts` | no | yes | no | owner_boundary_enforced | non_transactional | yes | low | Keep exact-copy notes writes on the shared owner boundary with post-write notes proof. |
| `saveVaultItemInstancePricingAction` | `apps/web/src/lib/vault/saveVaultItemInstancePricingAction.ts` | no | yes | yes | owner_boundary_enforced | non_transactional | yes | medium | Keep exact-copy pricing writes on the shared owner boundary with post-write pricing proof. |
| `saveVaultItemInstanceImageDisplayModeAction` | `apps/web/src/lib/vault/saveVaultItemInstanceImageDisplayModeAction.ts` | no | yes | yes | owner_boundary_enforced | non_transactional | yes | medium | Keep exact-copy image display writes on the shared owner boundary with post-write display-mode proof. |
| `assignConditionSnapshotAction` | `apps/web/src/lib/condition/assignConditionSnapshotAction.ts` | no | yes | no | owner_boundary_enforced | non_transactional | yes | medium | Keep condition snapshot assignment on the shared owner boundary with snapshot-to-instance lineage proof. |
| `importVaultItems` | `apps/web/src/lib/import/importVaultItems.ts` | no | yes | no | partial_owner_boundary_enforced | compensated_non_transactional | yes | medium | Bulk import now enters `execute_owner_write_v1.ts` and proves final owner-visible counts plus import summary compatibility. It remains compensated non-transactional because legacy anchor repair and per-copy RPC creation are still tolerated inside one bulk pass. |
| `saveVaultItemIntentAction` | `apps/web/src/lib/network/saveVaultItemIntentAction.ts` | no | yes | yes | intentionally blocked | non_transactional | n/a | low | Keep blocked. Grouped intent is already fail-closed and must stay non-authoritative. |
| `toggleSharedCardAction` | `apps/web/src/lib/sharedCards/toggleSharedCardAction.ts` | no | yes | yes | intentionally blocked | non_transactional | no | medium | Keep blocked. Grouped compatibility mutation is deprecated and must not regain authority over exact-copy trust surfaces. |
| `saveSharedCardWallCategoryAction` | `apps/web/src/lib/sharedCards/saveSharedCardWallCategoryAction.ts` | no | yes | yes | intentionally blocked | non_transactional | no | medium | Keep blocked. Grouped `wall_category` remains compatibility debris and must not surface as authoritative section or wall mutation. |
| `saveSharedCardPublicNoteAction` | `apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts` | no | yes | yes | intentionally blocked | non_transactional | no | medium | Keep blocked. Shared-card public notes must not impersonate exact-copy ownership truth. |

## Coverage Summary

### Runtime-enforced in this pass

- `external_discovery_to_warehouse_bridge_v1`
- `classification_apply_write_plan_v1`
- `classification_apply_reclassification_result_v1`
- `promotion_stage_create_stage_v1`
- `alias_mapping_execution_v1`
- `promotion_executor_execute_claimed_stage_v1`
- `gv_id_assignment_worker_v1`
- `source_image_enrichment_worker_v1`
- `promote_source_backed_justtcg_mapping_v1`
- `printing_upsert_v1`

### Equivalent owner-trust proofs added in this pass

- `createWallSectionAction`
- `updateWallSectionAction`
- `assignWallSectionMembershipAction`
- `removeWallSectionMembershipAction`
- `archiveVaultItemInstanceAction`
- `updateVaultItemQuantity`
- `addCardToVault`
- `createSlabInstance`
- `slab_upgrade_route`
- `createCardInteractionAction`
- `replyToCardInteractionGroupAction`
- `executeCardInteractionOutcomeAction`
- `saveVaultItemInstanceIntentAction`
- `importVaultItems`
- `saveVaultItemInstanceConditionAction`
- `saveVaultItemInstanceMediaAction`
- `saveVaultItemInstanceNotesAction`
- `saveVaultItemInstancePricingAction`
- `saveVaultItemInstanceImageDisplayModeAction`
- `assignConditionSnapshotAction`

### Intentionally blocked

- `staging_reconciliation_v1`
- `saveVaultItemIntentAction`
- `toggleSharedCardAction`
- `saveSharedCardWallCategoryAction`
- `saveSharedCardPublicNoteAction`

### Contained Maintenance Authority

- `legacy_identity_apply_scripts`
- `canon_maintenance_replay_and_migration_helpers`

## Audit Notes

- The existing runtime work already added pre-write validation and post-write proofs for the audited canon workers, but those paths were still entering validation and proof functions directly instead of through one required boundary.
- `staging_reconciliation_v1` is no longer an active canon mutation bypass. Direct writes were removed and the worker now fails closed until a runtime-safe rewrite exists.
- `legacy_identity_apply_scripts` are no longer a default canon bypass. Identity replay/repair scripts now require explicit maintenance mode, the dedicated entrypoint, and dry-run-default execution before any public-table mutation can proceed.
- `canon_maintenance_replay_and_migration_helpers` now cover the remaining non-runtime canon replay/backfill/promote lane. These scripts require explicit canon maintenance mode, the dedicated launcher, and dry-run-default execution before any public-table mutation can proceed.
- Ownership mutation coverage is still uneven. The Wall/Sections owner flows and archive/intent trust surfaces are the right first protection targets because they change what collectors and public viewers can trust immediately.
- `importVaultItems` audit before this pass: direct `resolveActiveVaultAnchor()` mutation, `vault_items.update()` compatibility mirroring, and `admin_vault_instance_create_v1` RPC writes all executed outside the owner boundary. This pass moved those mutations under `execute_owner_write_v1.ts` and added compensated import count proofs without changing CSV parse/match behavior.
- Grouped shared-card compatibility mutations are no longer deferred live writes. `toggleSharedCardAction`, `saveSharedCardWallCategoryAction`, and `saveSharedCardPublicNoteAction` now fail closed immediately and contain no DB mutation primitives.
- Exact-copy metadata audit before this pass: condition, media, notes, pricing, image display mode, and condition snapshot assignment each mutated directly with ad hoc `.update()` calls. This pass moved those writes under `execute_owner_write_v1.ts` and added exact-copy metadata proofs for each surface.
