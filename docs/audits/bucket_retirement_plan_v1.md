# Title
Bucket Retirement Plan V1

# Date
2026-03-16

# Objective
Define the safe, phased path from `public.vault_items` as a live compatibility mirror to `public.vault_item_instances` as the sole ownership truth, without breaking historical `vault_item_id` relationships, analytics, or compatibility surfaces that still depend on bucket-era data.

# Current Verified State
- Write-path cutover is complete for web and mobile ownership creation and archive flows. Canonical writes now create or archive `vault_item_instances` first, then mirror `vault_items`.
- Mobile read-path cutover is complete for owned counts. Ownership counts now come from active `vault_item_instances`; bucket quantities remain fallback or metadata only.
- Web read-path cutover is complete for collector-facing ownership counts. Card detail and vault list surfaces now prefer canonical instance counts.
- `vault_items` is no longer the primary ownership truth for collector-facing web/mobile ownership counts.
- `vault_items` still remains live as:
  - a compatibility mirror for write parity
  - a metadata source for some existing views
  - a historical ownership episode row
  - the current anchor for several media, scan, provenance, and sharing relationships via `vault_item_id`

# Remaining Bucket Dependencies
## ACTIVE RUNTIME DEPENDENCY
- [apps/web/src/app/card/[gv_id]/page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx): card detail ownership summary still falls back to `public.vault_items.qty` when canonical count lookup fails. Read-path, collector-facing, fallback-only, removable after one direct verification pass.
- [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx): vault list still reads `public.v_vault_items_web` for row metadata and still computes `quantity` as `canonicalQuantity ?? legacyQuantity`. Mixed read-path, collector-facing. Ownership fallback is removable; metadata bridge remains until a canonical instance-backed vault projection exists.
- [lib/main.dart](/c:/grookai_vault/lib/main.dart): mobile vault still reads `public.v_vault_items` for metadata and still retains `owned_count -> legacy_qty -> qty` fallback logic in `_ownedCountForRow`. Read-path, collector-facing. Ownership fallback is removable; metadata bridge remains until a canonical instance-backed mobile projection exists.
- [apps/web/src/lib/import/matchCardPrints.ts](/c:/grookai_vault/apps/web/src/lib/import/matchCardPrints.ts): import preview still reads `public.vault_items(gv_id, qty)` to decide existing ownership and compute deltas. Read-path, collector-facing import workflow. This still treats bucket quantity as current ownership truth for reconciliation.
- [supabase/functions/pricing-live-request/index.ts](/c:/grookai_vault/supabase/functions/pricing-live-request/index.ts): pricing freshness logic still sums `public.vault_items.qty` for `vaultCount`. Read-path, internal/runtime edge function, user-facing effect. This still treats buckets as live activity truth.

## COMPATIBILITY MIRROR DEPENDENCY
- [apps/web/src/lib/vault/addCardToVault.ts](/c:/grookai_vault/apps/web/src/lib/vault/addCardToVault.ts): canonical instance create runs first, then `mirrorLegacyVaultBucket(...)` inserts or increments `public.vault_items`. Mixed write-path, collector-facing, compatibility-only.
- [apps/web/src/lib/vault/updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts): canonical instance archive runs first, then bucket decrement/archive mirror updates `public.vault_items`. Mixed write-path, collector-facing, compatibility-only.
- [apps/web/src/lib/import/importVaultItems.ts](/c:/grookai_vault/apps/web/src/lib/import/importVaultItems.ts): import creates N canonical instances, then mirrors the same quantity into `public.vault_items`. Mixed write-path, collector-facing import, compatibility-only.
- [20260316113000_create_mobile_vault_instance_wrappers_v1.sql](/c:/grookai_vault/supabase/migrations/20260316113000_create_mobile_vault_instance_wrappers_v1.sql): `public.vault_add_card_instance_v1`, `public.vault_archive_one_instance_v1`, and `public.vault_archive_all_instances_v1` mirror bucket state after canonical instance mutation. Mixed write-path, mobile/authenticated compatibility lane.
- [20260313153000_vault_items_archival_ownership_episodes_v1.sql](/c:/grookai_vault/supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql): `public.vault_inc_qty` and archival bucket episode behavior still underpin compatibility updates and mirrored archive semantics.

## HISTORICAL / EPISODE DEPENDENCY
- [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx), [apps/web/src/components/vault/VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx), and [apps/web/src/components/vault/VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx): web vault UI still uses `vault_item_id` as the row identity for image presence, quantity mutation targets, share controls, and public-note/public-image state.
- [apps/web/src/lib/sharedCards/toggleSharedCardAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardAction.ts), [apps/web/src/lib/sharedCards/toggleSharedCardPublicImageAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardPublicImageAction.ts), and [apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts): sharing still resolves the active bucket row from `public.vault_items` and uses bucket identity to find linked public-share artifacts.
- [supabase/functions/scan-upload-plan/index.ts](/c:/grookai_vault/supabase/functions/scan-upload-plan/index.ts), [lib/services/scanner/condition_scan_service.dart](/c:/grookai_vault/lib/services/scanner/condition_scan_service.dart), and [backend/condition/fingerprint_worker_v1.mjs](/c:/grookai_vault/backend/condition/fingerprint_worker_v1.mjs): scanner and fingerprint flows still pass and persist `vault_item_id`, not GVVI, for capture, snapshot, and provenance linkage.
- [20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql](/c:/grookai_vault/supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql), [20251229214410_condition_snapshots_phase0_init.sql](/c:/grookai_vault/supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql), and [20251230045041_condition_snapshots_insert_rpc_v1.sql](/c:/grookai_vault/supabase/migrations/20251230045041_condition_snapshots_insert_rpc_v1.sql): fingerprint bindings, fingerprint provenance, and condition snapshots still persist `vault_item_id`.
- [20251213153626_baseline_functions.sql](/c:/grookai_vault/supabase/migrations/20251213153626_baseline_functions.sql) and [20251213153630_baseline_constraints.sql](/c:/grookai_vault/supabase/migrations/20251213153630_baseline_constraints.sql): `vault_item_set_user_photo`, `vault_item_delete_user_photo`, `vault_item_set_image_mode`, `rpc_set_item_condition`, `set_vault_item_condition`, `set_vault_item_grade`, `vault_post_to_wall`, plus foreign keys from `user_card_images`, `scans`, and `listings`, all still anchor to `public.vault_items(id)`.
- [20260316093000_create_slab_provenance_events_v1.sql](/c:/grookai_vault/supabase/migrations/20260316093000_create_slab_provenance_events_v1.sql), [20260316094500_create_admin_slab_event_insert_v1.sql](/c:/grookai_vault/supabase/migrations/20260316094500_create_admin_slab_event_insert_v1.sql), [20260316104500_create_vault_item_instances_v1.sql](/c:/grookai_vault/supabase/migrations/20260316104500_create_vault_item_instances_v1.sql), and [backend/vault/vault_instance_backfill_worker_v1.mjs](/c:/grookai_vault/backend/vault/vault_instance_backfill_worker_v1.mjs): slab provenance, legacy lineage, and backfill auditability all still retain optional or explicit linkage to legacy `vault_item_id`.

## ANALYTICS / REPORTING DEPENDENCY
- [apps/web/src/app/founder/page.tsx](/c:/grookai_vault/apps/web/src/app/founder/page.tsx): founder metrics still read `public.v_vault_items_web.quantity` for total quantity, per-card totals, distinct owners, and set rollups.
- [backend/pricing/pricing_scheduler_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_scheduler_v1.mjs): scheduler still builds `vaultQtyMap` from `public.vault_items(card_id, qty)` to decide freshness tiers and queue priority.
- [backend/pricing/pricing_backfill_worker_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_backfill_worker_v1.mjs): backfill worker still ranks candidates by aggregated `public.vault_items.qty`.
- [20260313153000_vault_items_archival_ownership_episodes_v1.sql](/c:/grookai_vault/supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql): `public.v_vault_items`, `public.v_vault_items_ext`, `public.v_vault_items_web`, and `public.v_recently_added` still expose bucket-shaped quantity fields and `vault_item_id` as if those are canonical row identities.

## LEGACY / DEAD DEPENDENCY
- [apps/web/scripts/rls_probe.mjs](/c:/grookai_vault/apps/web/scripts/rls_probe.mjs): tooling still probes `v_vault_items` and `v_vault_items_ext`, but this is not a collector/runtime requirement.
- [apps/web/README.md](/c:/grookai_vault/apps/web/README.md), old audits, and backup files such as [main.dart.bak.20250831-115309](/c:/grookai_vault/lib/main.dart.bak.20250831-115309): documentation and historical artifacts still describe or preserve bucket-era behavior, but they are not live runtime dependencies.

# Dependency Classification Summary
| Classification | Count | Notes |
|---|---:|---|
| ACTIVE RUNTIME DEPENDENCY | 5 | Remaining live bucket-truth or bucket-fallback reads |
| COMPATIBILITY MIRROR DEPENDENCY | 5 | Canonical instance writes still mirrored into `vault_items` |
| HISTORICAL / EPISODE DEPENDENCY | 6 | `vault_item_id`-anchored artifacts, provenance, scans, media, and legacy lineage |
| ANALYTICS / REPORTING DEPENDENCY | 4 | Founder/admin/pricing surfaces still sum `qty` or consume bucket views |
| LEGACY / DEAD DEPENDENCY | 2 | Tooling, docs, backups |
| Total meaningful remaining bucket dependencies | 22 | Distinct runtime/schema/tooling surfaces that still depend on bucket-era structures |

# Target End State
- Ownership truth: `public.vault_item_instances` only.
- Canonical owned-object identity: `gv_vi_id`.
- Active ownership definition: `public.vault_item_instances.archived_at IS NULL`.
- Intended ongoing role of `public.vault_items`: ownership episode archive + legacy bridge.
- Rationale from repo evidence:
  - `vault_item_id` still anchors live media, sharing, scan, listing, and provenance-adjacent systems.
  - archived bucket rows still capture historical ownership episodes that are not yet represented elsewhere.
  - compatibility mirrors still support analytics, import reconciliation, and operational freshness logic.
- Non-goal of retirement: immediate deletion of `public.vault_items`.
- Bucket semantics after formal demotion:
  - `qty` is not canonical ownership
  - `vault_items` is not collector ownership truth
  - any surviving use of `vault_items` is historical, compatibility, metadata, or bridge behavior only

# Phased Retirement Plan
## Phase 1 — Remove fallback-only collector reads
- Remove the direct `public.vault_items.qty` fallback on [apps/web/src/app/card/[gv_id]/page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx).
- Remove `canonicalQuantity ?? legacyQuantity` ownership fallback on [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx).
- Remove `owned_count -> legacy_qty -> qty` fallback logic on [lib/main.dart](/c:/grookai_vault/lib/main.dart).
- Keep the existing metadata reads temporarily if the UI still depends on bucket-backed projections for non-ownership fields.
- Ordering reason: collector-facing ownership truth is already canonical, so these are the safest low-risk removals.

## Phase 2 — Remove bucket-based quantity logic from analytics/admin surfaces
- Replace founder/admin quantity totals in [apps/web/src/app/founder/page.tsx](/c:/grookai_vault/apps/web/src/app/founder/page.tsx) with canonical instance aggregates.
- Replace `vault_items.qty` activity signals in [supabase/functions/pricing-live-request/index.ts](/c:/grookai_vault/supabase/functions/pricing-live-request/index.ts), [backend/pricing/pricing_scheduler_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_scheduler_v1.mjs), and [backend/pricing/pricing_backfill_worker_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_backfill_worker_v1.mjs) with canonical active-instance counts.
- Replace import preview/reconciliation ownership deltas in [apps/web/src/lib/import/matchCardPrints.ts](/c:/grookai_vault/apps/web/src/lib/import/matchCardPrints.ts) so import math stops using bucket quantity as current ownership truth.
- Ordering reason: these are still live operational/runtime dependencies, but they are less user-visible than collector read fallbacks and should move after the collector surfaces are fully clean.

## Phase 3 — Reclassify bucket views as metadata/history only
- Stop treating `public.v_vault_items`, `public.v_vault_items_ext`, and `public.v_vault_items_web` as ownership-truth projections.
- Either:
  - keep the views only for metadata/history fields, while removing or documenting `qty` / `quantity` as non-canonical, or
  - replace the ownership fields in those projections with canonical instance-derived aggregates if the views still need to survive.
- Ordering reason: views sit under multiple collector/admin surfaces; reclassification is safe only after phases 1 and 2 remove quantity truth assumptions above them.

## Phase 4 — Isolate historical `vault_item_id` consumers
- Keep live `vault_item_id` consumers intact while documenting each subsystem:
  - sharing/public-note/public-image controls
  - `user_card_images`
  - scan upload and condition snapshots
  - fingerprint bindings/provenance
  - listings and wall-post functions
  - slab provenance optional linkage
  - legacy lineage on `vault_item_instances.legacy_vault_item_id`
- For each subsystem, decide later whether it should:
  - keep `vault_item_id` as historical episode identity
  - migrate to GVVI or `vault_item_instances.id`
  - preserve both identities for auditability
- Ordering reason: these are not ownership-count problems; they are artifact-reconciliation problems and cannot be removed blindly.

## Phase 5 — Formal demotion of bucket semantics
- Update contracts/docs so they say explicitly:
  - `vault_item_instances` is ownership truth
  - `gv_vi_id` is canonical owned-object identity
  - `vault_items.qty` is compatibility/history only
  - `vault_items` is not collector ownership truth
- Mark surviving bucket views and helpers as non-canonical.
- Define which mirrored writes remain temporarily allowed and why.
- Ordering reason: formal demotion should happen only after collector and analytics surfaces stop treating buckets as truth.

## Phase 6 — Optional future hard deprecation
- Only after all collector, analytics, and reconciliation surfaces are migrated:
  - stop compatibility mirror writes
  - freeze new bucket mutation paths
  - consider eventual removal of bucket-specific write helpers and quantity views
- This phase is explicitly future-only.

# Removal Rules
- Do not remove any bucket dependency until its canonical instance replacement path is proven live.
- Do not remove `vault_item_id` consumers until their historical or artifact replacement identity is designed and verified.
- Do not stop compatibility mirror writes while any runtime, analytics, or reconciliation path still expects live bucket parity.
- Do not delete `vault_items` while scans, images, listings, fingerprint provenance, slab provenance, or ownership-episode audit flows still reference it.
- Do not remove analytics/admin bucket surfaces blindly; replace them with canonical instance aggregates first.
- Do not treat `qty = 0` archived bucket rows as disposable if they still carry ownership-episode or artifact lineage.

# Remove Now / Remove Later / Keep
## Remove now
- [apps/web/src/app/card/[gv_id]/page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
  - Reason: fallback-only `vault_items.qty` ownership read.
  - Recommended action: remove the fallback and fail closed to canonical count `0` or canonical-read error handling.
- [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
  - Reason: `canonicalQuantity ?? legacyQuantity` still keeps bucket quantity alive as ownership fallback.
  - Recommended action: remove legacy quantity fallback while keeping metadata rows if still needed.
- [lib/main.dart](/c:/grookai_vault/lib/main.dart)
  - Reason: `_ownedCountForRow` still falls back to `legacy_qty` / `qty` even though canonical counts are already wired.
  - Recommended action: remove bucket quantity fallback and let mobile ownership display depend on canonical counts only.

## Remove after one more verification window
- [apps/web/src/lib/import/matchCardPrints.ts](/c:/grookai_vault/apps/web/src/lib/import/matchCardPrints.ts)
  - Reason: import reconciliation still uses bucket qty as existing ownership truth.
  - Recommended action: replace with canonical instance counts after one more import parity window.
- [supabase/functions/pricing-live-request/index.ts](/c:/grookai_vault/supabase/functions/pricing-live-request/index.ts)
  - Reason: runtime pricing freshness still uses bucket-derived `vaultCount`.
  - Recommended action: replace with canonical active-instance aggregates after verifying collector read cutover stability.
- [backend/pricing/pricing_scheduler_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_scheduler_v1.mjs)
  - Reason: queue priority still uses bucket qty.
  - Recommended action: replace with canonical active-instance counts.
- [backend/pricing/pricing_backfill_worker_v1.mjs](/c:/grookai_vault/backend/pricing/pricing_backfill_worker_v1.mjs)
  - Reason: backfill ranking still uses bucket qty and bucket created-at history.
  - Recommended action: replace ownership counts with canonical instance aggregates, then decide whether bucket episode recency still matters.
- [apps/web/src/app/founder/page.tsx](/c:/grookai_vault/apps/web/src/app/founder/page.tsx)
  - Reason: admin metrics still treat `v_vault_items_web.quantity` as vault truth.
  - Recommended action: cut over founder/admin metrics after one more runtime verification window.
- [public.v_vault_items](/c:/grookai_vault/supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql#L213), [public.v_vault_items_ext](/c:/grookai_vault/supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql#L347), and [public.v_vault_items_web](/c:/grookai_vault/supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql#L427)
  - Reason: views still surface bucket-shaped ownership semantics even where callers now overlay canonical counts.
  - Recommended action: reclassify or replace after the consumers above are cut over.

## Keep for historical/system reasons
- [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx), [apps/web/src/components/vault/VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx), and [apps/web/src/components/vault/VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
  - Reason: live vault photo/share/remove flows still use `vault_item_id` as the bridge to historical artifacts.
  - Recommended action: keep until those features are redesigned around GVVI or `vault_item_instances.id`.
- [apps/web/src/lib/sharedCards/toggleSharedCardAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardAction.ts), [apps/web/src/lib/sharedCards/toggleSharedCardPublicImageAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardPublicImageAction.ts), and [apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts)
  - Reason: sharing/public-note/public-image flows still resolve the active bucket row and bucket-linked media.
  - Recommended action: keep until sharing gets its own GVVI-aware reconciliation design.
- [supabase/functions/scan-upload-plan/index.ts](/c:/grookai_vault/supabase/functions/scan-upload-plan/index.ts), [lib/services/scanner/condition_scan_service.dart](/c:/grookai_vault/lib/services/scanner/condition_scan_service.dart), and [backend/condition/fingerprint_worker_v1.mjs](/c:/grookai_vault/backend/condition/fingerprint_worker_v1.mjs)
  - Reason: scan capture, condition snapshots, and fingerprint provenance still depend on `vault_item_id`.
  - Recommended action: keep until scanner/provenance reconciliation is explicitly designed.
- [20251213153626_baseline_functions.sql](/c:/grookai_vault/supabase/migrations/20251213153626_baseline_functions.sql), [20251213153630_baseline_constraints.sql](/c:/grookai_vault/supabase/migrations/20251213153630_baseline_constraints.sql), [20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql](/c:/grookai_vault/supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql), and [20260316093000_create_slab_provenance_events_v1.sql](/c:/grookai_vault/supabase/migrations/20260316093000_create_slab_provenance_events_v1.sql)
  - Reason: foreign keys, artifact tables, and provenance lanes still preserve historical bucket relationships.
  - Recommended action: keep as historical bridge infrastructure until dedicated migration work exists.
- [backend/vault/vault_instance_backfill_worker_v1.mjs](/c:/grookai_vault/backend/vault/vault_instance_backfill_worker_v1.mjs) and [20260316104500_create_vault_item_instances_v1.sql](/c:/grookai_vault/supabase/migrations/20260316104500_create_vault_item_instances_v1.sql#L9)
  - Reason: `legacy_vault_item_id` is the current lineage bridge from bucket episodes to instance rows.
  - Recommended action: keep for auditability even after collector/runtime bucket retirement.

# Final Contract Language
- `public.vault_item_instances` is the sole ownership truth for Grookai Vault.
- Active owned quantity is derived only from active instance rows where `archived_at IS NULL`.
- `gv_vi_id` is the canonical identity of an owned vault object.
- `public.vault_items` is not an ownership-truth table.
- `public.vault_items.qty` is not canonical ownership.
- Any surviving use of `public.vault_items` is historical, compatibility, metadata, or legacy-bridge behavior only.
- `public.vault_items` remains the ownership episode archive + legacy bridge until all `vault_item_id`-anchored artifact systems are explicitly reconciled.
- Compatibility mirror writes remain temporary and must not be removed until runtime reads, analytics, and reconciliation surfaces no longer require live bucket parity.

# Risks
- Historical artifact breakage risk: removing `vault_item_id` infrastructure too early would break user photos, scans, listings, and provenance relationships.
- Analytics drift risk: founder/pricing/import surfaces will misreport activity if bucket quantity logic is removed before canonical aggregate replacements land.
- Premature fallback removal risk: collector surfaces should only drop their last bucket fallback after one clean verification window confirms canonical read stability.
- Scanner/media/provenance reconciliation risk: these systems cannot be cut over by simple search-and-replace because they encode episode lineage, not just owned counts.
- Mirror removal risk: stopping compatibility writes before all downstream consumers are migrated would reintroduce parity drift across ops and legacy surfaces.

# Recommended Immediate Next Action
Remove the remaining fallback-only collector reads.
