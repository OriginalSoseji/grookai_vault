# Vault Write-Path Cutover Audit v1

## Title
Vault Write-Path Cutover Audit v1

## Date
2026-03-16

## Scope
This audit covers the full ownership write-path cutover from legacy bucket ownership in `public.vault_items` to true owned-instance ownership in `public.vault_item_instances` with `gv_vi_id` as canonical ownership identity.

This is an audit and implementation plan only.

No code was changed.

No migrations were created.

No runtime behavior was changed.

## Executive Summary
The current repo still routes live collector ownership writes through legacy bucket rows in `public.vault_items`. The target ownership model is already present in schema through `public.vault_item_instances`, `public.vault_owners`, and `public.admin_vault_instance_create_v1(...)`, but app write paths have not been cut over.

Proven repo-visible write surfaces found in this audit: `18`

- `8` are `A. ACTIVE PRIMARY OWNERSHIP WRITE`
- `3` are `B. ACTIVE COMPATIBILITY WRITE`
- `5` are `C. SPECIAL CASE WRITE`
- `2` are `D. LEGACY / DEAD WRITE`

The highest-risk blockers are:

- Mobile `lib/main.dart` still updates and deletes `vault_items` rows directly by legacy bucket `id`.
- Scanner, condition, media, and fingerprint-adjacent flows still anchor to `vault_item_id` and must not be remapped naively.
- Web and mobile reads still treat `vault_items.qty` and bucket views as canonical ownership truth, so active write cutover requires temporary bucket mirroring.

No repo-visible edge function or backend worker besides the completed backfill worker currently performs canonical collector ownership creation against the instance lane. The first implementation phase should therefore create and adopt canonical instance write adapters in existing web/mobile helper surfaces, then dual-run those writes against legacy buckets until read-path cutover is complete.

## Current Ownership Target Model
Canonical ownership target for cutover:

- One row in `public.vault_item_instances` equals one owned object.
- Canonical ownership identity is `gv_vi_id`.
- Raw ownership rows use `card_print_id`.
- Slab ownership rows use `slab_cert_id`.
- `public.vault_items` is a temporary legacy compatibility bucket during cutover, not the future source of truth.

Cutover rule for this phase:

- New canonical ownership writes must create or mutate `vault_item_instances`.
- While legacy read paths still depend on bucket rows, live write paths must dual-run through an instance write plus a legacy bucket mirror.
- Historical artifacts keyed to `vault_items.id` must not be synthetically remapped during this phase.

## Evidence Sources Audited
Primary repo evidence:

- `apps/web/src/app/card/[gv_id]/page.tsx`
- `apps/web/src/app/vault/page.tsx`
- `apps/web/src/app/vault/import/ImportClient.tsx`
- `apps/web/src/components/vault/VaultCollectionView.tsx`
- `apps/web/src/lib/vault/addCardToVault.ts`
- `apps/web/src/lib/vault/updateVaultItemQuantity.ts`
- `apps/web/src/lib/vault/changeVaultItemQuantityAction.ts`
- `apps/web/src/lib/import/importVaultItems.ts`
- `apps/web/src/lib/import/matchCardPrints.ts`
- `apps/web/src/lib/sharedCards/toggleSharedCardAction.ts`
- `apps/web/src/lib/sharedCards/toggleSharedCardPublicImageAction.ts`
- `apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts`
- `lib/main.dart`
- `lib/services/vault/vault_card_service.dart`
- `lib/screens/identity_scan/identity_scan_screen.dart`
- `lib/screens/scanner/scan_identify_screen.dart`
- `lib/screens/scanner/scan_capture_screen.dart`
- `lib/services/scanner/condition_scan_service.dart`
- `backend/vault/vault_instance_backfill_worker_v1.mjs`
- `backend/package.json`
- `backend/condition/fingerprint_worker_v1.mjs`
- `supabase/functions/scan-upload-plan/index.ts`
- `supabase/functions/pricing-live-request/index.ts`
- `supabase/migrations/20251213153626_baseline_functions.sql`
- `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql`
- `supabase/migrations/20260316090000_create_slab_certs_v1.sql`
- `supabase/migrations/20260316101500_create_vault_owners_v1.sql`
- `supabase/migrations/20260316104500_create_vault_item_instances_v1.sql`
- `supabase/migrations/20260316110000_create_admin_vault_instance_create_v1.sql`

Hint-only prior audit reference, re-proved against current code:

- `docs/audits/web_vault_contract_reuse_audit_v1.md`

## Proven Write Paths Table
| Status | Surface | File | Function / Entry | Current Operation | Current Target | Reachability | Identity Used | Classification | Required Migration Action | Bucket Mirror Needed | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Server action | web | `apps/web/src/app/card/[gv_id]/page.tsx` | `addToVaultAction` | Card page add-to-vault action delegates to legacy helper | `server action` | Proven live | `user.id`, `resolvedCard.id`, `resolvedCard.gv_id` | `A. ACTIVE PRIMARY OWNERSHIP WRITE` | `1. REPLACE WITH INSTANCE CREATE` | Yes | Card page still reads `vault_items.qty` for count summary. |
| Helper | web | `apps/web/src/lib/vault/addCardToVault.ts` | `addCardToVault` | Selects active bucket by `user_id + card_id`, inserts `qty=1`, or increments existing bucket row | `helper wrapper` | Proven live | `card_id`, `gv_id`, legacy bucket `id` | `A. ACTIVE PRIMARY OWNERSHIP WRITE` | `1. REPLACE WITH INSTANCE CREATE` | Yes | Current create semantics are bucket-oriented. |
| Helper | web | `apps/web/src/lib/vault/updateVaultItemQuantity.ts` | `updateVaultItemQuantity` | Reads bucket row by `id`, increments/decrements `qty`, archives row on zero | `helper wrapper` | Proven live | legacy bucket `id`, `user_id`, `card_id`, `gv_id` | `A. ACTIVE PRIMARY OWNERSHIP WRITE` | `2. REPLACE WITH INSTANCE ARCHIVE / INSTANCE MUTATION` | Yes | Archive-on-zero is the current canonical web removal behavior. |
| Server action | web | `apps/web/src/lib/vault/changeVaultItemQuantityAction.ts` | `changeVaultItemQuantityAction` | Auth wrapper around `updateVaultItemQuantity` | `server action` | Proven live | legacy bucket `id` | `A. ACTIVE PRIMARY OWNERSHIP WRITE` | `2. REPLACE WITH INSTANCE ARCHIVE / INSTANCE MUTATION` | Yes | Server action stays as the web vault mutation entrypoint. |
| Client entry | web | `apps/web/src/app/vault/import/ImportClient.tsx` | `handleImport` | Starts server-side import flow for matched rows | `server action` | Proven live | matched `gv_id` set from preview | `C. SPECIAL CASE WRITE` | `4. HOLD FOR RECONCILIATION DESIGN` | Yes | Import expands many owned copies and currently assumes bucket reconciliation. |
| Helper | web | `apps/web/src/lib/import/importVaultItems.ts` | `importVaultItems` | Aggregates by `gv_id`, inserts bucket rows or calls `vault_inc_qty` | `helper wrapper` | Proven live | `gv_id`, `card_id`, legacy bucket `id`, `qty` | `C. SPECIAL CASE WRITE` | `4. HOLD FOR RECONCILIATION DESIGN` | Yes | Bulk import must expand to per-object instance creates. |
| Direct write | mobile | `lib/main.dart` | `_incQty` | Directly updates `vault_items.qty` by row `id` | `vault_items` | Proven live | legacy bucket `id` | `A. ACTIVE PRIMARY OWNERSHIP WRITE` | `2. REPLACE WITH INSTANCE ARCHIVE / INSTANCE MUTATION` | Yes | Bypasses archive-on-zero helper semantics. |
| Direct write | mobile | `lib/main.dart` | `_delete` | Directly deletes bucket row by `id` | `vault_items` | Proven live | legacy bucket `id` | `A. ACTIVE PRIMARY OWNERSHIP WRITE` | `2. REPLACE WITH INSTANCE ARCHIVE / INSTANCE MUTATION` | Yes | Delete semantics conflict with current web archive-on-zero behavior. |
| Helper | mobile | `lib/services/vault/vault_card_service.dart` | `addOrIncrementVaultItem` | Reads by `user_id + gv_id`, updates `qty`, or inserts new bucket row | `helper wrapper` | Proven live | `user_id`, `card_id`, `gv_id`, legacy bucket `id` | `A. ACTIVE PRIMARY OWNERSHIP WRITE` | `1. REPLACE WITH INSTANCE CREATE` | Yes | Shared helper used by multiple mobile add flows. |
| UI entry | mobile | `lib/screens/identity_scan/identity_scan_screen.dart` | `_addToVault` | Reachable identity scan add button delegates to `VaultCardService.addOrIncrementVaultItem` | `helper wrapper` | Proven live | `card_print_id`, `user_id`, resolved `gv_id` | `A. ACTIVE PRIMARY OWNERSHIP WRITE` | `1. REPLACE WITH INSTANCE CREATE` | Yes | This is the proven reachable mobile add-to-vault path. |
| UI entry | mobile | `lib/screens/scanner/scan_identify_screen.dart` | `_addToVault` | Legacy scanner add flow delegates to `VaultCardService.addOrIncrementVaultItem` | `helper wrapper` | Likely legacy | `card_print_id`, `user_id`, resolved `gv_id` | `D. LEGACY / DEAD WRITE` | `6. DELETE LATER AFTER VALIDATION` | No | Screen is defined but not referenced by current navigation, and `card-identify` is placeholder-only. |
| SQL function | sql | `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql` | `public.vault_add_or_increment` | Authenticated bucket upsert by `user_id + card_id`, increments `qty` or inserts active bucket row | `RPC` | Likely live | `auth.uid()`, `card_id`, bucket `qty` | `B. ACTIVE COMPATIBILITY WRITE` | `3. WRAP WITH INSTANCE WRITE + BUCKET MIRROR` | Yes | Current repo code does not call it directly, but it remains an exposed compatibility write surface. |
| SQL function | sql | `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql` | `public.vault_inc_qty` | Authenticated bucket quantity mutation by `item_id`, archives on zero | `RPC` | Proven live | legacy bucket `id` | `B. ACTIVE COMPATIBILITY WRITE` | `3. WRAP WITH INSTANCE WRITE + BUCKET MIRROR` | Yes | Web import flow currently depends on this RPC. |
| SQL RPC | sql | `supabase/migrations/20251213153626_baseline_functions.sql` | `public.rpc_set_item_condition` | Updates legacy vault row condition and optional condition price | `RPC` | Proven live | `p_vault_item_id`, `p_card_id` | `C. SPECIAL CASE WRITE` | `4. HOLD FOR RECONCILIATION DESIGN` | No | Not an ownership cardinality write, but still anchored to legacy `vault_item_id`. |
| SQL function | sql | `supabase/migrations/20251213153626_baseline_functions.sql` | `public.vault_add_item` | Direct bucket insert helper returning new `vault_items.id` | `RPC` | Dead / unreferenced | `p_user_id`, `p_card_id` | `D. LEGACY / DEAD WRITE` | `6. DELETE LATER AFTER VALIDATION` | No | No current repo-visible caller found. |
| Internal RPC | sql | `supabase/migrations/20260316110000_create_admin_vault_instance_create_v1.sql` | `public.admin_vault_instance_create_v1` | Canonical backend-authoritative one-row instance create with GVVI allocation | `RPC` | Likely live | `user_id`, `card_print_id` or `slab_cert_id`, `gv_vi_id` | `B. ACTIVE COMPATIBILITY WRITE` | `5. NO CHANGE IN WRITE-PATH PHASE` | No | This is the correct instance-lane create primitive for cutover. |
| Worker | backend | `backend/vault/vault_instance_backfill_worker_v1.mjs` | `runBackfill` / `createInstanceRow` | Migration worker creates missing instance rows from legacy buckets via `admin_vault_instance_create_v1` | `worker` | Likely legacy | legacy bucket `id`, `card_id`, `qty`, generated `gv_vi_id` | `C. SPECIAL CASE WRITE` | `5. NO CHANGE IN WRITE-PATH PHASE` | No | Backfill tooling is not a collector-facing write path and should not be repurposed for live writes. |
| Trigger | sql | `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql` | `public.vault_items_unshare_on_archive_fn` / `trg_vault_items_unshare_on_archive` | Deletes `shared_cards` rows when a legacy bucket archives | `vault_items` | Proven live | `vault_items.user_id`, `card_id`, `gv_id` | `C. SPECIAL CASE WRITE` | `4. HOLD FOR RECONCILIATION DESIGN` | Yes | Archive side effect still assumes sharing is bucket/card-level. |

## Path-by-Path Evidence
### `apps/web/src/app/card/[gv_id]/page.tsx` — `addToVaultAction`
- Reachability: proven live. The public card page imports `addCardToVault` and exposes a server action through `AddToVaultCardAction`.
- Operation: create or increment ownership for one card.
- Current target: server action wrapper around the legacy helper.
- Identity used: `user.id`, canonical `resolvedCard.id`, public `resolvedCard.gv_id`.
- Ownership model: bucket-oriented because the delegate helper writes `vault_items`.
- Archive/remove behavior: none in this action.
- Direct replacement safety: safe to cut over after a canonical instance add adapter exists.
- Bucket mirror requirement: yes, because the same page still reads `vault_items.qty` for the ownership summary.
- Downstream dependency: card page ownership count still assumes bucket quantity truth.

### `apps/web/src/lib/vault/addCardToVault.ts` — `addCardToVault`
- Reachability: proven live via card page server action.
- Operation: read active bucket row, insert new bucket row, or increment existing bucket row.
- Current target: helper wrapper over direct `vault_items` CRUD.
- Identity used: `card_id`, `gv_id`, and legacy bucket `id`.
- Ownership model: creates quantity buckets, not object instances.
- Archive/remove behavior: none here; increment path delegates to bucket quantity helper.
- Direct replacement safety: safe to replace with canonical instance create semantics.
- Bucket mirror requirement: yes, until read-path cutover finishes.
- Downstream dependency: any path still reading `vault_items` or `v_vault_items_web` expects bucket parity.

### `apps/web/src/lib/vault/updateVaultItemQuantity.ts` — `updateVaultItemQuantity`
- Reachability: proven live via web vault quantity controls.
- Operation: increment or decrement bucket `qty`; archive row on zero.
- Current target: helper wrapper over direct `vault_items` update.
- Identity used: legacy bucket `id`, `user_id`, plus `card_id` and `gv_id` for logging.
- Ownership model: bucket mutation.
- Archive/remove behavior: archives on zero by setting `qty=0` and `archived_at`.
- Direct replacement safety: replaceable, but decrement semantics must map to archiving one instance at a time while still mirroring bucket quantity.
- Bucket mirror requirement: yes.
- Downstream dependency: `shared_cards` archive trigger and bucket views still depend on archival of the legacy row.

### `apps/web/src/lib/vault/changeVaultItemQuantityAction.ts` — `changeVaultItemQuantityAction`
- Reachability: proven live from `VaultCollectionView`.
- Operation: auth wrapper around `updateVaultItemQuantity`.
- Current target: server action.
- Identity used: legacy bucket `id`.
- Ownership model: delegates to bucket mutation.
- Archive/remove behavior: inherited from `updateVaultItemQuantity`.
- Direct replacement safety: safe once underlying canonical instance mutation adapter exists.
- Bucket mirror requirement: yes.
- Downstream dependency: `/vault` revalidation still assumes legacy read model.

### `apps/web/src/app/vault/import/ImportClient.tsx` — `handleImport`
- Reachability: proven live. `/vault/import` renders `ImportClient`, and `handleImport` calls the server import helper.
- Operation: collector-triggered bulk import entrypoint.
- Current target: client entry to server action.
- Identity used: matched preview rows keyed by `gv_id`.
- Ownership model: bulk bucket reconciliation.
- Archive/remove behavior: none directly.
- Direct replacement safety: not safe for naive cutover because one import row can imply many instance creates.
- Bucket mirror requirement: yes if cut over during legacy reads.
- Downstream dependency: preview and import reconciliation still assume bucket quantity truth.

### `apps/web/src/lib/import/importVaultItems.ts` — `importVaultItems`
- Reachability: proven live via `ImportClient`.
- Operation: aggregates rows by `gv_id`, inserts a bucket or calls `vault_inc_qty`.
- Current target: helper wrapper over direct `vault_items` insert and bucket RPC.
- Identity used: `gv_id`, `card_id`, legacy bucket `id`, `qty`.
- Ownership model: explicit bucket write path.
- Archive/remove behavior: not directly; only positive quantity import.
- Direct replacement safety: not safe for naive swap because this flow must expand N imported copies into N canonical instance creates.
- Bucket mirror requirement: yes during transition.
- Downstream dependency: `matchCardPrints` still queries existing bucket quantities for import reconciliation.

### `lib/main.dart` — `_incQty`
- Reachability: proven live from the mobile vault surface.
- Operation: direct update of `vault_items.qty` by `id`.
- Current target: direct table write to `vault_items`.
- Identity used: legacy bucket `id`.
- Ownership model: bucket mutation.
- Archive/remove behavior: none. This path allows `qty=0` without archive semantics.
- Direct replacement safety: replaceable, but only after a mobile-safe instance mutation adapter exists.
- Bucket mirror requirement: yes.
- Downstream dependency: mobile live vault list reads `v_vault_items`, not the instance lane.

### `lib/main.dart` — `_delete`
- Reachability: proven live from the mobile vault surface.
- Operation: direct delete of `vault_items` by `id`.
- Current target: direct table delete on `vault_items`.
- Identity used: legacy bucket `id`.
- Ownership model: destructive bucket removal.
- Archive/remove behavior: delete, not archive.
- Direct replacement safety: not safe as a direct port. This path must become instance archival or compatibility archive logic, not raw delete.
- Bucket mirror requirement: yes.
- Downstream dependency: delete semantics differ from web archive-on-zero and from existing sharing/scanner historical expectations.

### `lib/services/vault/vault_card_service.dart` — `addOrIncrementVaultItem`
- Reachability: proven live from mobile catalog add, identity scan, and scanner add flows.
- Operation: resolve canonical card, find existing bucket by `user_id + gv_id`, update `qty`, or insert bucket row.
- Current target: helper wrapper over direct `vault_items` CRUD.
- Identity used: `user_id`, `card_id`, `gv_id`, legacy bucket `id`.
- Ownership model: bucket create or increment.
- Archive/remove behavior: none.
- Direct replacement safety: safe as a central mobile add adapter once canonical instance create is wired.
- Bucket mirror requirement: yes.
- Downstream dependency: all mobile add flows share this helper, so it is the main mobile cutover seam.

### `lib/screens/identity_scan/identity_scan_screen.dart` — `_addToVault`
- Reachability: proven live. `main.dart` launches `IdentityScanScreen` both from capture flow and from the vault FAB path.
- Operation: adds the selected identified card to the vault.
- Current target: helper wrapper through `VaultCardService.addOrIncrementVaultItem`.
- Identity used: candidate `card_print_id`, authenticated `user_id`, resolved `gv_id`.
- Ownership model: bucket create or increment through shared helper.
- Archive/remove behavior: none.
- Direct replacement safety: safe after `VaultCardService` is cut over.
- Bucket mirror requirement: yes.
- Downstream dependency: navigation returns to detail screens that still read legacy ownership state.

### `lib/screens/scanner/scan_identify_screen.dart` — `_addToVault`
- Reachability: likely legacy. The screen is defined in repo, but current navigation references only `IdentityScanScreen`, and this screen still uses placeholder `card-identify`.
- Operation: add identified card to vault through `VaultCardService`.
- Current target: helper wrapper.
- Identity used: candidate `card_print_id`, authenticated `user_id`, resolved `gv_id`.
- Ownership model: bucket create or increment through shared helper.
- Archive/remove behavior: none.
- Direct replacement safety: do not port first. Validate whether this screen is still intended to survive cutover.
- Bucket mirror requirement: no near-term change; delete later if confirmed dead.
- Downstream dependency: none proven beyond the shared helper.

### `public.vault_add_or_increment`
- Reachability: likely live as an exposed authenticated compatibility function, even though current repo-visible web/mobile code does not call it directly.
- Operation: bucket upsert keyed by `auth.uid() + card_id`.
- Current target: RPC.
- Identity used: `auth.uid()`, `card_id`, bucket `qty`.
- Ownership model: bucket create or increment.
- Archive/remove behavior: none.
- Direct replacement safety: should be wrapped behind canonical instance create plus legacy mirror if retained for compatibility callers.
- Bucket mirror requirement: yes.
- Downstream dependency: legacy callers outside current repo may still exist, so this function cannot be deleted during first cutover pass.

### `public.vault_inc_qty`
- Reachability: proven live because `importVaultItems` calls it.
- Operation: bucket increment/decrement by legacy row `id`, archiving on zero.
- Current target: RPC.
- Identity used: legacy bucket `id`.
- Ownership model: bucket mutation.
- Archive/remove behavior: archive on zero.
- Direct replacement safety: should become a compatibility wrapper if legacy callers remain during transition.
- Bucket mirror requirement: yes.
- Downstream dependency: import flow and any external caller still expect bucket semantics.

### `public.rpc_set_item_condition`
- Reachability: proven live via `VaultCollectionView.changeCondition`.
- Operation: updates `vault_items.condition_label` and optional condition price.
- Current target: RPC.
- Identity used: `p_vault_item_id`, `p_card_id`.
- Ownership model: not a create/remove write, but still mutates legacy vault-row state.
- Archive/remove behavior: none.
- Direct replacement safety: do not naively port in the ownership cutover phase because condition edits remain keyed to legacy row identity.
- Bucket mirror requirement: no immediate bucket mirror recommendation; hold for reconciliation design.
- Downstream dependency: UI and pricing side effects still assume legacy `vault_item_id`.

### `public.vault_add_item`
- Reachability: dead or unreferenced in current repo-visible code.
- Operation: direct bucket insert helper.
- Current target: RPC.
- Identity used: `p_user_id`, `p_card_id`.
- Ownership model: bucket create.
- Archive/remove behavior: none.
- Direct replacement safety: do not invest in cutover. Validate no external caller remains, then delete later.
- Bucket mirror requirement: no.
- Downstream dependency: none proven in current repo.

### `public.admin_vault_instance_create_v1`
- Reachability: likely live as the canonical backend-authoritative instance creator. The backfill worker calls it, but product writes do not yet.
- Operation: ensures owner namespace, allocates next owner-scoped index, generates `gv_vi_id`, inserts one `vault_item_instances` row.
- Current target: RPC.
- Identity used: `user_id`, `card_print_id` or `slab_cert_id`, `gv_vi_id`.
- Ownership model: one row per owned object.
- Archive/remove behavior: can create archived rows if passed `p_archived_at`, but no update semantics.
- Direct replacement safety: this is the correct primitive to reuse.
- Bucket mirror requirement: no. This is canonical instance creation, not legacy bucket compatibility.
- Downstream dependency: live app code still needs adapters that call it.

### `backend/vault/vault_instance_backfill_worker_v1.mjs`
- Reachability: likely legacy migration tooling. No backend package script points at it, and authoritative context says backfill is complete.
- Operation: reads active bucket rows and creates missing instance rows through `admin_vault_instance_create_v1`.
- Current target: worker.
- Identity used: legacy bucket `id`, `card_id`, `qty`, generated `gv_vi_id`.
- Ownership model: instance create for migration.
- Archive/remove behavior: none against legacy rows.
- Direct replacement safety: do not reuse this worker as live write-path logic.
- Bucket mirror requirement: no.
- Downstream dependency: only migration parity verification.

### `public.vault_items_unshare_on_archive_fn` / `trg_vault_items_unshare_on_archive`
- Reachability: proven live whenever a legacy bucket row archives.
- Operation: deletes `shared_cards` rows for the matching `user_id + card_id/gv_id`.
- Current target: trigger on `vault_items`.
- Identity used: legacy bucket row values.
- Ownership model: compatibility side effect attached to bucket archival.
- Archive/remove behavior: runs only on archive transition.
- Direct replacement safety: do not port during primary ownership write cutover without deciding instance-vs-card sharing semantics.
- Bucket mirror requirement: yes as long as archive is still mirrored to legacy buckets.
- Downstream dependency: current sharing remains card-level, not instance-level.

## Classification Summary
Totals:

- Total repo-visible write paths classified: `18`
- `A. ACTIVE PRIMARY OWNERSHIP WRITE`: `8`
- `B. ACTIVE COMPATIBILITY WRITE`: `3`
- `C. SPECIAL CASE WRITE`: `5`
- `D. LEGACY / DEAD WRITE`: `2`

Active primary ownership writes:

- `apps/web/src/app/card/[gv_id]/page.tsx` — `addToVaultAction`
- `apps/web/src/lib/vault/addCardToVault.ts` — `addCardToVault`
- `apps/web/src/lib/vault/updateVaultItemQuantity.ts` — `updateVaultItemQuantity`
- `apps/web/src/lib/vault/changeVaultItemQuantityAction.ts` — `changeVaultItemQuantityAction`
- `lib/main.dart` — `_incQty`
- `lib/main.dart` — `_delete`
- `lib/services/vault/vault_card_service.dart` — `addOrIncrementVaultItem`
- `lib/screens/identity_scan/identity_scan_screen.dart` — `_addToVault`

Active compatibility writes:

- `public.vault_add_or_increment`
- `public.vault_inc_qty`
- `public.admin_vault_instance_create_v1`

Special-case writes:

- `apps/web/src/app/vault/import/ImportClient.tsx` — `handleImport`
- `apps/web/src/lib/import/importVaultItems.ts` — `importVaultItems`
- `public.rpc_set_item_condition`
- `backend/vault/vault_instance_backfill_worker_v1.mjs`
- `public.vault_items_unshare_on_archive_fn`

Legacy or dead writes:

- `lib/screens/scanner/scan_identify_screen.dart` — `_addToVault`
- `public.vault_add_item`

## Cutover Plan
### Phase 1 — create canonical instance write adapters
Exact files:

- `apps/web/src/lib/vault/addCardToVault.ts`
- `apps/web/src/lib/vault/updateVaultItemQuantity.ts`
- `lib/services/vault/vault_card_service.dart`

Exact mutation behavior to replace:

- Replace direct `vault_items` create/increment behavior with calls into the canonical instance create path backed by `public.admin_vault_instance_create_v1`.
- Introduce instance-side archive or mutation helpers for decrement/remove semantics without changing read paths yet.
- Preserve the current auth-scoped helper entrypoints so card page, web vault, and mobile add flows can switch without a broad surface-area rewrite.

Exact dependency assumptions:

- `public.admin_vault_instance_create_v1` remains the authoritative one-row instance create primitive.
- Temporary bucket mirroring is still required because active reads continue to depend on `vault_items` and bucket views.

Exact reason for ordering:

- These helper files are the narrowest reusable seams across live web and mobile writes.
- Creating adapters first prevents duplicating instance logic across server actions, Flutter UI callbacks, and import code.

### Phase 2 — cut over active add-to-vault paths
Exact files:

- `apps/web/src/app/card/[gv_id]/page.tsx`
- `apps/web/src/lib/vault/addCardToVault.ts`
- `lib/services/vault/vault_card_service.dart`
- `lib/screens/identity_scan/identity_scan_screen.dart`

Exact mutation behavior to replace:

- Web card add-to-vault: create one instance row instead of incrementing a bucket.
- Mobile identity scan add: create one instance row instead of incrementing a bucket.
- Mobile catalog add through `VaultCardService`: create `deltaQty` instance rows, one per owned object.

Exact dependency assumptions:

- Current reads still use `vault_items` or `qty`, so every instance create must still update or preserve the legacy bucket aggregate.
- `ScanIdentifyScreen` is not part of this phase because it is likely legacy.

Exact reason for ordering:

- Add flows are simpler than decrement/delete because they do not need archive-on-zero decisions.
- Web and mobile both already centralize add logic in helper layers identified in Phase 1.

### Phase 3 — cut over quantity/archive paths
Exact files:

- `apps/web/src/lib/vault/updateVaultItemQuantity.ts`
- `apps/web/src/lib/vault/changeVaultItemQuantityAction.ts`
- `apps/web/src/components/vault/VaultCollectionView.tsx`
- `lib/main.dart`

Exact mutation behavior to replace:

- Web increment: create one new instance row, then mirror bucket increment.
- Web decrement/remove: archive one owned instance row, then mirror bucket decrement or archive.
- Mobile increment: same as web increment.
- Mobile delete: stop raw delete; map to instance archival semantics and mirrored bucket archival behavior.

Exact dependency assumptions:

- Current views still expose one bucket row with `quantity`, so the mirror must keep aggregate parity during this phase.
- The app still uses legacy `vault_item_id` for condition scans, sharing, and media.

Exact reason for ordering:

- Archive and delete semantics are riskier than adds because the legacy bucket model collapses multiple owned objects into one row.
- Cut over after canonical create adapters exist and after add paths are stable.

### Phase 4 — wire temporary bucket mirror for compatibility
Exact files:

- `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql` functions to be superseded or wrapped in later implementation work
- `apps/web/src/lib/import/importVaultItems.ts`
- `lib/services/vault/vault_card_service.dart`
- `apps/web/src/lib/vault/addCardToVault.ts`
- `apps/web/src/lib/vault/updateVaultItemQuantity.ts`

Exact mutation behavior to replace:

- Preserve legacy bucket parity as a derived compatibility write, not as canonical ownership truth.
- Compatibility helpers such as `vault_add_or_increment` and `vault_inc_qty` should become thin wrappers or stop being primary callers.
- Import flow must expand bulk quantity into per-object instance creates while maintaining the legacy aggregate for remaining reads.

Exact dependency assumptions:

- `v_vault_items`, `v_vault_items_web`, card page counts, import reconciliation, and mobile vault list all still assume `qty` is canonical.
- `shared_cards` archive trigger still depends on legacy bucket archival.

Exact reason for ordering:

- Mirroring becomes a compatibility layer only after primary add and quantity flows write canonical instances first.

### Phase 5 — validate parity against legacy bucket model
Exact files:

- `apps/web/src/app/vault/page.tsx`
- `apps/web/src/app/card/[gv_id]/page.tsx`
- `apps/web/src/lib/import/matchCardPrints.ts`
- `lib/main.dart`
- `backend/vault/vault_instance_backfill_worker_v1.mjs`

Exact mutation behavior to replace:

- No new product write behavior in this phase.
- Add parity verification comparing instance counts per legacy bucket lineage, card ownership counts, and archive outcomes.

Exact dependency assumptions:

- Legacy bucket rows still exist and remain readable.
- Backfill lineage via `legacy_vault_item_id` is intact.

Exact reason for ordering:

- Read-path cutover should not begin until live dual-run writes show parity against the existing bucket model.

### Phase 6 — mark dead legacy write paths for deletion after validation
Exact files:

- `lib/screens/scanner/scan_identify_screen.dart`
- legacy SQL helper `public.vault_add_item`
- any retained bucket compatibility wrappers proved unused after cutover validation

Exact mutation behavior to replace:

- No replacement if the path is genuinely dead.
- Remove only after validation proves no live caller remains.

Exact dependency assumptions:

- Reachability must be re-checked after active path cutover completes.

Exact reason for ordering:

- Deleting legacy paths before parity validation risks removing emergency compatibility escape hatches too early.

## Dual-Run Recommendation
Default recommendation for all active collector-facing ownership writes:

- Use `canonical instance write + legacy bucket mirror`.

Reason:

- Active web reads still use `v_vault_items_web`, `vault_items.qty`, `shared_cards`, and `user_card_images` keyed to legacy row identity.
- Active mobile reads still use `v_vault_items` and direct bucket `id` actions.
- Import reconciliation still uses existing bucket `qty`.
- Scanner, condition, media, and fingerprint-adjacent flows still expect legacy `vault_item_id`.

Paths that should dual-run immediately during cutover:

- `apps/web/src/app/card/[gv_id]/page.tsx` → `addToVaultAction`
- `apps/web/src/lib/vault/addCardToVault.ts`
- `apps/web/src/lib/vault/updateVaultItemQuantity.ts`
- `apps/web/src/lib/vault/changeVaultItemQuantityAction.ts`
- `lib/services/vault/vault_card_service.dart`
- `lib/main.dart` → `_incQty`
- `lib/main.dart` → `_delete`
- `lib/screens/identity_scan/identity_scan_screen.dart` → `_addToVault`

Paths that should not be naively dual-run yet:

- `apps/web/src/lib/import/importVaultItems.ts`
- `public.rpc_set_item_condition`
- scanner and condition artifact flows keyed to `vault_item_id`

## Blockers / Open Design Decisions
- `vault_items.id` is still the active identity for scanner capture, condition snapshots, upload storage paths, user card images, public image sharing, and fingerprint-adjacent flows.
- Mobile `lib/main.dart` still performs raw bucket delete by `id`. This must be reconciled with archive-on-zero and instance archival semantics before cutover.
- Web card page still reads `vault_items.qty` directly for ownership count.
- Web `/vault` still reads `v_vault_items_web`, maps `vault_item_id ?? id`, and reads `user_card_images` by legacy `vault_item_id`.
- Web sharing flows still resolve by legacy bucket/card identity:
  - `toggleSharedCardAction`
  - `toggleSharedCardPublicImageAction`
  - `saveSharedCardPublicNoteAction`
- `public.vault_items_unshare_on_archive_fn` still assumes sharing lifecycle is tied to bucket archival, not instance archival.
- Import preview and import write paths still assume bucket quantity is canonical:
  - `apps/web/src/lib/import/matchCardPrints.ts`
  - `apps/web/src/lib/import/importVaultItems.ts`
- Pricing compatibility helpers remain read-only in this audit, but they still read bucket quantity:
  - `supabase/functions/pricing-live-request/index.ts`
  - backend pricing workers reading `vault_items`
- `public.rpc_set_item_condition` and `public.set_vault_item_condition` still key row-state edits to legacy `vault_item_id`.
- Scanner and historical artifact safety remains unresolved:
  - `lib/services/scanner/condition_scan_service.dart`
  - `lib/screens/scanner/scan_capture_screen.dart`
  - `supabase/functions/scan-upload-plan/index.ts`
  - `backend/condition/fingerprint_worker_v1.mjs`
- Open ownership decision still required for decrement/remove cutover:
  - when multiple active instance rows share the same `card_print_id`, the archive selection rule must be deterministic
  - recommended future rule is owner-scoped deterministic ordering, but that is not implemented in this audit

## Exact Next Implementation Order
1. `apps/web/src/lib/vault/addCardToVault.ts`
   Reason: first canonical helper seam for web add flows.
2. `lib/services/vault/vault_card_service.dart`
   Reason: first canonical helper seam for mobile add flows.
3. `apps/web/src/app/card/[gv_id]/page.tsx`
   Reason: wire the live web add-to-vault entry to the new adapter.
4. `lib/screens/identity_scan/identity_scan_screen.dart`
   Reason: wire the live mobile add-to-vault entry to the new adapter.
5. `apps/web/src/lib/vault/updateVaultItemQuantity.ts`
   Reason: replace bucket quantity mutations with instance mutations plus mirror.
6. `apps/web/src/lib/vault/changeVaultItemQuantityAction.ts`
   Reason: keep web server action contract stable while underlying semantics change.
7. `apps/web/src/components/vault/VaultCollectionView.tsx`
   Reason: validate web optimistic quantity/remove behavior against the new mutation results.
8. `lib/main.dart`
   Reason: remove raw `vault_items` update/delete writes from the live mobile vault surface.
9. `apps/web/src/lib/import/importVaultItems.ts`
   Reason: redesign import to expand one row per owned object after simple add/remove paths are stable.
10. `apps/web/src/lib/import/matchCardPrints.ts`
    Reason: move import reconciliation off bucket `qty` only after instance write parity is proven.
11. `apps/web/src/app/vault/page.tsx`
    Reason: prepare vault read cutover only after write parity exists.
12. `apps/web/src/lib/sharedCards/toggleSharedCardAction.ts`
    Reason: sharing stays blocked behind legacy bucket identity until ownership writes are stable.
13. `apps/web/src/lib/sharedCards/toggleSharedCardPublicImageAction.ts`
    Reason: image-sharing still depends on legacy `vault_item_id`.
14. `apps/web/src/lib/sharedCards/saveSharedCardPublicNoteAction.ts`
    Reason: public note flow still resolves through legacy bucket/card identity.
15. `lib/services/scanner/condition_scan_service.dart`
    Reason: scanner artifact reconciliation is intentionally later and must not be guessed during write cutover.
16. `lib/screens/scanner/scan_capture_screen.dart`
    Reason: scanner UI still depends on legacy `vaultItemId`.
17. `supabase/functions/scan-upload-plan/index.ts`
    Reason: storage path identity should not change until scanner reconciliation is designed.
18. `lib/screens/scanner/scan_identify_screen.dart`
    Reason: delete later only after current navigation confirms it is dead.
19. Legacy SQL helper cleanup after validation:
    - `public.vault_add_item`
    - any retained compatibility wrappers proved unused

## Verification Checklist
- Every repo-visible `vault_items` write path in current code or SQL has been classified.
- Every repo-visible ownership mutation surface is marked as one of:
  - `A. ACTIVE PRIMARY OWNERSHIP WRITE`
  - `B. ACTIVE COMPATIBILITY WRITE`
  - `C. SPECIAL CASE WRITE`
  - `D. LEGACY / DEAD WRITE`
- Every active write path has an explicit migration action.
- Every active write path states whether temporary bucket mirroring is required.
- Scanner, media, condition, and provenance-like artifact paths are called out as blockers, not speculatively rewritten.
- The implementation order is deterministic and file-specific.
