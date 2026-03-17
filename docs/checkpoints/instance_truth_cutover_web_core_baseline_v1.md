# Instance Truth Cutover — Web Core Baseline V1

Date: 2026-03-17  
Status: ACTIVE BASELINE (stable web-core cutover; controlled transitional compatibility remains)

## Summary
- Grookai Vault now has a real instance-truth ownership architecture built on `public.vault_item_instances` and `gv_vi_id`.
- Web core ownership behavior is cut over to canonical instance truth for the main collector surfaces that matter most:
  - web write path is canonical-first
  - import preview and execution reconcile against active instances
  - web vault collector read-model is canonical-row-sourced
  - pricing/admin analytics are canonical
- Legacy bucket structures and `vault_item_id` anchors still exist intentionally as controlled compatibility and historical bridges.
- This is a stable baseline for continued migration work. It is not full platform retirement of bucket-era structures.

## What Is Complete
- Canonical instance truth is established in `public.vault_item_instances`.
- GVVI issuance is established through the authoritative allocator path.
- Web add-to-vault is canonical-first, with legacy bucket mirroring preserved for compatibility.
- Web quantity decrement/archive is canonical-first, with legacy bucket mirroring preserved for compatibility.
- Web quantity increment is canonical-first, with legacy bucket mirroring preserved for compatibility.
- Import preview uses active instance counts as current ownership truth.
- Import execution uses active instance counts as current ownership truth and creates one canonical instance per imported owned object.
- Web collector vault row sourcing now runs through a canonical instance-derived projection instead of reading `v_vault_items_web` directly.
- Collector-facing web ownership counts are canonical.
- Pricing and founder/admin analytics are canonical and no longer treat `vault_items.qty` as ownership truth.

## What Remains Transitional
- Mobile vault row sourcing is still hybrid and still reads `v_vault_items` for row shape and compatibility identity.
- `vault_item_id` remains a live compatibility/runtime anchor in collector UI state, photo linkage, and some mutation payloads.
- Shared-card flows remain intentionally dual-anchor:
  - prefer `gv_vi_id` when deterministically available
  - preserve `vault_item_id` fallback where reconciliation safety still requires it
- Condition snapshot flows remain intentionally dual-anchor:
  - `gv_vi_id` for assigned object truth
  - `vault_item_id` for unresolved historical lineage
- Legacy views and metadata compatibility still exist where they are still the lowest-risk bridge:
  - `v_vault_items`
  - `v_vault_items_ext`
  - `v_vault_items_web`
- Full bucket retirement is not yet safe.

## System State
- Ownership truth:
  - active ownership truth = `public.vault_item_instances where archived_at is null`
  - canonical owned-object identity = `gv_vi_id`
- Web core state:
  - stable and usable on canonical ownership truth
  - still carrying explicit compatibility fields where runtime identity has not yet been fully migrated
- Mobile state:
  - canonical counts
  - hybrid row sourcing
- Historical and reconciliation state:
  - `vault_items` remains an ownership episode archive + legacy bridge
  - `vault_item_id` remains valid where historical meaning or reconciliation safety still depends on it

## Risks / Follow-Ups
- Build the mobile canonical collector projection so mobile vault row sourcing no longer depends on `v_vault_items`.
- Gradually reduce collector/runtime dependency on `vault_item_id` where a stable GVVI-native action identity can replace it safely.
- Continue isolating or migrating clearly object-level consumers from `vault_item_id` to GVVI only when mapping is deterministic.
- Keep condition and shared-card dual-anchor behavior explicit until those systems have safe object-native replacements.
- Retire bucket-era compatibility only after mobile row sourcing and remaining runtime anchors are reconciled.

## Resume Instruction
Resume from: **mobile canonical collector projection + explicit reduction of `vault_item_id` runtime anchors**, using this baseline:
- web core instance-truth cutover achieved
- mobile still hybrid
- reconciliation fallbacks remain intentional
- bucket retirement still deferred
