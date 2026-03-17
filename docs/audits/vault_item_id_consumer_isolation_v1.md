# Vault Item ID Consumer Isolation V1

## Date
2026-03-16

## Objective
Isolate every meaningful remaining `vault_item_id` consumer so Grookai Vault can treat `vault_item_instances` / `GVVI` as canonical active ownership truth while preserving `vault_items.id` only where it still carries valid historical ownership episode meaning.

## Current Verified System State
- Active ownership truth now lives in `public.vault_item_instances`, with active ownership defined by `archived_at IS NULL`.
- Collector-facing web and mobile reads/writes have already been cut over to canonical instance truth.
- Analytics/admin quantity surfaces have already been cut over to canonical instance truth.
- `public.vault_items` is no longer an ownership truth table.
- `public.vault_items` remains as an ownership episode archive + legacy bridge.
- Any remaining `vault_item_id` consumer is now either a historical anchor, a compatibility bridge, or an unresolved migration/reconciliation problem.

## `vault_item_id` Consumer Inventory

| Consumer | File / Object | Surface Type | Reference Type | Current Purpose | Live Status | Classification | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| User card image rows and photo lookups | [20251213153625_baseline_init.sql](/c:/grookai_vault/supabase/migrations/20251213153625_baseline_init.sql), [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx), [toggleSharedCardPublicImageAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardPublicImageAction.ts) | schema | FK | Per-episode user photo linkage and public image lookup by legacy row id | proven live | KEEP AS HISTORICAL EPISODE REFERENCE | Existing photos are anchored to the vault row that owned/uploaded them. Blind reassignment to synthetic instances would be unsafe. |
| Legacy user-photo write RPCs | [20251213153626_baseline_functions.sql](/c:/grookai_vault/supabase/migrations/20251213153626_baseline_functions.sql) | rpc/function | write target | Legacy helpers that write `user_card_images` against `vault_item_id` | dead / unreferenced | LEGACY / DEAD CONSUMER | No live app/runtime reference was found. |
| Condition snapshot insert pipeline | [20251229214410_condition_snapshots_phase0_init.sql](/c:/grookai_vault/supabase/migrations/20251229214410_condition_snapshots_phase0_init.sql), [20251230045041_condition_snapshots_insert_rpc_v1.sql](/c:/grookai_vault/supabase/migrations/20251230045041_condition_snapshots_insert_rpc_v1.sql), [condition_scan_service.dart](/c:/grookai_vault/lib/services/scanner/condition_scan_service.dart) | rpc/function | write target | Immutable condition scan snapshots keyed to the scanned vault episode | proven live | SPECIAL RECONCILIATION REQUIRED | Snapshots are object-like observations, but historical bucket rows may have represented multiple copies. |
| Scan upload planner | [index.ts](/c:/grookai_vault/supabase/functions/scan-upload-plan/index.ts) | edge function | payload field | Builds signed upload paths under `user_id/vault_item_id/snapshot_id/...` | proven live | SPECIAL RECONCILIATION REQUIRED | Path layout and snapshot lifecycle still encode episode identity. |
| Legacy `scans` table | [20251213153625_baseline_init.sql](/c:/grookai_vault/supabase/migrations/20251213153625_baseline_init.sql) | schema | FK | Legacy scan storage anchored to `vault_item_id` | likely historical | LEGACY / DEAD CONSUMER | Current condition pipeline explicitly uses `condition_snapshots`, not `public.scans`. |
| Fingerprint bindings | [20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql](/c:/grookai_vault/supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql), [20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql](/c:/grookai_vault/supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql), [fingerprint_worker_v1.mjs](/c:/grookai_vault/backend/condition/fingerprint_worker_v1.mjs) | schema | FK | Primary fingerprint-to-owned-item binding | proven live | SPECIAL RECONCILIATION REQUIRED | Fingerprint bindings are conceptually object-level, but historical bucket rows do not map deterministically to split instances. |
| Fingerprint provenance ledger | [20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql](/c:/grookai_vault/supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql), [fingerprint_worker_v1.mjs](/c:/grookai_vault/backend/condition/fingerprint_worker_v1.mjs) | schema | FK | Append-only fingerprint event history with `vault_item_id` context | proven live | SPECIAL RECONCILIATION REQUIRED | Provenance events inherit the same ambiguity as fingerprint bindings and condition snapshots. |
| Match-card helper view | [20260205222100_match_card_surface_v1.sql](/c:/grookai_vault/supabase/migrations/20260205222100_match_card_surface_v1.sql) | view | join | Resolves fingerprint candidate snapshot -> `condition_snapshots` -> `vault_items` -> card display | likely live | SPECIAL RECONCILIATION REQUIRED | Read helper still depends on episode linkage to resolve candidate card metadata. |
| Bucket-bound condition edit RPC | [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx), [20251213153626_baseline_functions.sql](/c:/grookai_vault/supabase/migrations/20251213153626_baseline_functions.sql) | web runtime | payload field | Updates condition on a legacy bucket row via `p_vault_item_id` | proven live | SPECIAL RECONCILIATION REQUIRED | Condition is object-level semantics, but the current edit path still targets aggregated episode rows. |
| Bucket-bound grade edit function | [20251213153626_baseline_functions.sql](/c:/grookai_vault/supabase/migrations/20251213153626_baseline_functions.sql) | rpc/function | write target | Legacy grade setter keyed to `vault_item_id` | dead / unreferenced | LEGACY / DEAD CONSUMER | No live caller was found. |
| Legacy listings / wall-post anchor | [20251213153625_baseline_init.sql](/c:/grookai_vault/supabase/migrations/20251213153625_baseline_init.sql), [20251213153626_baseline_functions.sql](/c:/grookai_vault/supabase/migrations/20251213153626_baseline_functions.sql) | schema | FK | Legacy listing rows and `vault_post_to_wall(...)` anchor marketplace content to `vault_item_id` | dead / unreferenced | LEGACY / DEAD CONSUMER | No live runtime reference was found; future marketplace work should be GVVI-native instead of reviving this anchor. |
| Slab provenance contextual ownership link | [20260316093000_create_slab_provenance_events_v1.sql](/c:/grookai_vault/supabase/migrations/20260316093000_create_slab_provenance_events_v1.sql), [20260316094500_create_admin_slab_event_insert_v1.sql](/c:/grookai_vault/supabase/migrations/20260316094500_create_admin_slab_event_insert_v1.sql) | schema | FK | Optional historical ownership episode context on slab provenance events | likely historical | KEEP AS HISTORICAL EPISODE REFERENCE | Slab provenance is anchored to `slab_cert_id`; `vault_item_id` is contextual and can remain a historical episode reference. |
| Instance backfill lineage | [20260316104500_create_vault_item_instances_v1.sql](/c:/grookai_vault/supabase/migrations/20260316104500_create_vault_item_instances_v1.sql), [vault_instance_backfill_worker_v1.mjs](/c:/grookai_vault/backend/vault/vault_instance_backfill_worker_v1.mjs) | backend worker | filter | Keeps canonical instances linked back to the source bucket episode for auditability and replay safety | proven live | KEEP AS HISTORICAL EPISODE REFERENCE | This is explicit lineage, not active ownership truth. |
| Web vault compatibility ids | [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx), [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx), [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx) | web runtime | payload field | Uses `vault_item_id` as UI action key for archive/share/condition flows | proven live | MIGRATE LATER TO GVVI | Active ownership already uses canonical counts; the UI action identifier should eventually become `gv_vi_id` or an instance-native payload. |
| Mobile archive compatibility ids | [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart), [20260316113000_create_mobile_vault_instance_wrappers_v1.sql](/c:/grookai_vault/supabase/migrations/20260316113000_create_mobile_vault_instance_wrappers_v1.sql) | mobile runtime | payload field | Optional `p_vault_item_id` passed into instance archive wrappers | proven live | MIGRATE LATER TO GVVI | The wrapper already accepts `p_card_print_id`; future mobile payloads should stop sending legacy ids. |
| Web shared-card actions | [toggleSharedCardAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardAction.ts), [saveSharedCardPublicNoteAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts), [toggleSharedCardPublicImageAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardPublicImageAction.ts) | web runtime | read lookup | Resolves a legacy vault row before mutating `shared_cards` or public image settings | proven live | MIGRATE LATER TO GVVI | These actions are compatibility lookups today. Future owned-object sharing should not resolve through a legacy bucket id. |

## Classification Summary
- KEEP AS HISTORICAL EPISODE REFERENCE: `3`
- MIGRATE LATER TO GVVI: `3`
- SPECIAL RECONCILIATION REQUIRED: `6`
- LEGACY / DEAD CONSUMER: `4`

## High-Risk Areas

### Scans and condition snapshots
1. Episode-bound or object-bound: object-bound observations currently written against an episode id.
2. Can it stay on `vault_item_id` forever: existing rows can remain as historical episode records; future object-native scan history should not.
3. Should it move to GVVI later: yes, for future object-native scanning.
4. Deterministic pairing rules required: yes.
5. Exact migration risk: a single historical bucket row could have represented multiple copies, so forcing old scans/snapshots onto synthetic instances risks attaching a scan to the wrong object.

### User media and public image controls
1. Episode-bound or object-bound: existing `user_card_images` are episode-bound.
2. Can it stay on `vault_item_id` forever: yes for historical rows.
3. Should it move to GVVI later: only for future object-native media, not by force-remapping old rows.
4. Deterministic pairing rules required: yes if any historical migration is attempted.
5. Exact migration risk: wrong front/back photo could be shown or shared for the wrong owned object.

### Fingerprint bindings and fingerprint provenance
1. Episode-bound or object-bound: object-bound.
2. Can it stay on `vault_item_id` forever: no as a future design target, but existing history cannot be blindly moved.
3. Should it move to GVVI later: yes.
4. Deterministic pairing rules required: yes.
5. Exact migration risk: provenance corruption, false duplicate detection, and misbinding of future rescans to the wrong owned object.

### Listings and marketplace-adjacent legacy surfaces
1. Episode-bound or object-bound: object-bound.
2. Can it stay on `vault_item_id` forever: legacy rows can remain untouched; future marketplace systems should not use it.
3. Should it move to GVVI later: yes, by rebuilding marketplace flows on GVVI instead of reviving the old anchor.
4. Deterministic pairing rules required: yes for any historical reuse.
5. Exact migration risk: old listings may have represented bucket quantity rather than a single owned object.

### Sharing, notes, and condition controls
1. Episode-bound or object-bound: mixed. Current behavior still resolves through the bucket row while the concepts are moving toward object-level ownership.
2. Can it stay on `vault_item_id` forever: no for active UX payloads.
3. Should it move to GVVI later: yes.
4. Deterministic pairing rules required: yes for any historical carry-forward of bucket-bound edits.
5. Exact migration risk: edits or sharing state may attach to the wrong object if a legacy row once represented multiple copies.

### Slab provenance
1. Episode-bound or object-bound: primarily slab-object-bound, with `vault_item_id` as context only.
2. Can it stay on `vault_item_id` forever: yes as optional historical context.
3. Should it move to GVVI later: not required for provenance correctness because the canonical anchor is `slab_cert_id`.
4. Deterministic pairing rules required: no for retaining the existing contextual field.
5. Exact migration risk: low if the field remains explicitly historical/contextual.

## Isolation Strategy

### Phase 1 — Protect historical episode systems
- Keep `public.user_card_images`, `public.slab_provenance_events.vault_item_id`, and `public.vault_item_instances.legacy_vault_item_id` explicitly documented as valid historical/lineage episode anchors.
- Do not rewrite or backfill these anchors to GVVI automatically.

### Phase 2 — Mark object-level future systems
- Mark web/mobile runtime payload ids, shared-card action lookups, and future marketplace/object-sharing surfaces as GVVI migration targets.
- Any new object-level runtime surface must prefer `gv_vi_id` over `vault_item_id`.

### Phase 3 — Fence ambiguous consumers
- Put a no-touch rule around condition snapshots, scan upload planning, fingerprint bindings/provenance, match-card helper joins, and bucket-bound condition edits until a dedicated reconciliation playbook exists.
- No developer should remap those historical rows without a deterministic pairing rule.

### Phase 4 — Remove dead consumers
- Queue legacy unreferenced surfaces for later cleanup only after an explicit dead-code validation pass:
  - `public.scans`
  - `public.vault_item_set_user_photo(...)`
  - `public.set_vault_item_grade(...)`
  - `public.listings.vault_item_id` / `public.vault_post_to_wall(...)`

## Hard Rules
1. `vault_item_instances` / `GVVI` is canonical for active object ownership.
2. `vault_items.id` may remain valid for historical ownership episode references.
3. No consumer may be migrated from `vault_item_id` to GVVI without proving the mapping is deterministic.
4. Ambiguous historical artifacts must not be force-attached to synthetic split instances.
5. New object-level systems must prefer GVVI, not `vault_item_id`.
6. Historical systems may continue to use `vault_item_id` when the ownership episode itself is the correct anchor.

## Keep / Migrate Later / Special Reconciliation / Dead

### Keep As Historical Episode Reference
- `public.user_card_images` and its live photo/public-image lookup paths
- `public.slab_provenance_events.vault_item_id`
- `public.vault_item_instances.legacy_vault_item_id` and the backfill worker lineage checks

### Migrate Later To GVVI
- Web vault runtime action payload ids
- Mobile archive wrapper payload ids
- Web shared-card action lookups

### Special Reconciliation Required
- `public.condition_snapshots` + `condition_snapshots_insert_v1`
- `scan-upload-plan`
- `public.fingerprint_bindings`
- `public.fingerprint_provenance_events`
- `public.v_condition_snapshot_analyses_match_card_v1`
- `public.rpc_set_item_condition` / `public.set_vault_item_condition`

### Legacy / Dead Consumer
- `public.vault_item_set_user_photo(...)`
- `public.scans`
- `public.set_vault_item_grade(...)`
- `public.listings.vault_item_id` / `public.vault_post_to_wall(...)`

## Risks
- Accidental destruction of historical meaning if valid ownership episode anchors are removed too early.
- False object-level remapping if historical bucket rows are treated as one-to-one with later split instances.
- Provenance corruption if fingerprint or slab/context history is rebound without deterministic proof.
- Media and fingerprint ambiguity if old photos or scans are attached to the wrong synthetic instance.
- Premature deletion of useful episode anchors that still serve auditability, lineage, or compatibility duties.

## Recommended Immediate Next Action
draft a dedicated reconciliation playbook for ambiguous historical artifact systems
