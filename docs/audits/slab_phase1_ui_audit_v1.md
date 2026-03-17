# SLAB PHASE 1 UI AUDIT V1

## Status

BLOCKED

## Scope

This audit is limited to Phase 1 UI-only slab visibility from `docs/playbooks/SLAB_SYSTEM_PLAYBOOK_V1.md`. It does not include schema changes, migrations, worker changes, lifecycle changes, archival changes, provenance changes, or implementation work.

## Repo Evidence

### 1. Owned Object Data Shape

Web collector vault rows are currently shaped by `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts` via `CanonicalVaultCollectorRow`. The live row contract is:

- `id`
- `vault_item_id`
- `gv_vi_id`
- `card_id`
- `gv_id`
- `name`
- `set_code`
- `set_name`
- `number`
- `condition_label`
- `owned_count`
- `effective_price`
- `image_url`
- `created_at`

That helper reads active `vault_item_instances`, but only selects `card_print_id`, `gv_vi_id`, `created_at`, and `legacy_vault_item_id`, and explicitly filters with `card_print_id is not null`. No slab fields are selected or returned.

Web vault UI expects that same shape in `apps/web/src/components/vault/VaultCardTile.tsx` (`VaultCardData`) and `apps/web/src/app/vault/page.tsx` (`normalizeVaultItems(...)`). The current live owned-card UI fields are:

- identity: `id`, `vault_item_id`, `gv_vi_id`, `card_id`, `gv_id`
- display: `name`, `set_code`, `set_name`, `number`, `condition_label`, `image_url`
- ownership/value: `owned_count`, `effective_price`, `created_at`
- sharing/photo controls: `is_shared`, `public_note`, `show_personal_front`, `show_personal_back`, `has_front_photo`, `has_back_photo`

Web card detail ownership is not an owned-object row surface. `apps/web/src/app/card/[gv_id]/page.tsx` only loads canonical ownership count through `getOwnedCountsByCardPrintIds(...)` and renders `You own X copy/copies`.

Public collector cards are shaped separately in `apps/web/src/lib/getSharedCardsBySlug.ts`. `SharedCard` currently contains:

- `gv_id`
- `name`
- `set_code`
- `set_name`
- `number`
- `rarity`
- `image_url`
- `back_image_url`
- `public_note`

No slab fields exist in that public card payload.

Mobile collector rows are currently shaped by `public.vault_mobile_collector_rows_v1()` in `supabase/migrations/20260317101500_create_mobile_vault_collector_rows_v1.sql` and consumed by `lib/services/vault/vault_card_service.dart`. The returned mobile row contract is:

- `id`
- `vault_item_id`
- `card_id`
- `gv_id`
- `condition_label`
- `created_at`
- `name`
- `set_name`
- `number`
- `photo_url`
- `image_url`
- `owned_count`
- `gv_vi_id`

That RPC also derives from active `vault_item_instances`, but explicitly filters with `card_print_id is not null`. No slab fields are returned.

Mobile UI in `lib/main.dart` uses those fields to render the vault list. `lib/card_detail_screen.dart` receives summary arguments only: card print id, GV-ID, name, set name, number, image URL, quantity, and condition.

`apps/mobile` is not present in this repo. The mobile app surfaces live under `lib/`.

### 2. Existing Slab Signals

Real fields:

- `supabase/migrations/20260316090000_create_slab_certs_v1.sql`
  - creates `public.slab_certs`
  - real slab fields include `gv_slab_id`, `grader`, `cert_number`, `card_print_id`, `grade`, `qualifiers`, `subgrades`, `label_variant`, `label_metadata`
- `supabase/migrations/20260316104500_create_vault_item_instances_v1.sql`
  - creates `public.vault_item_instances`
  - real owned-object slab fields include `slab_cert_id`, `is_graded`, `grade_company`, `grade_value`, `grade_label`
  - identity anchor rule allows exactly one of `card_print_id` or `slab_cert_id`
- `apps/web/src/app/founder/page.tsx`
  - real slab-aware internal read path
  - reads `vault_item_instances.slab_cert_id`
  - resolves slab rows through `slab_certs.card_print_id`

Real fields, but not used by current collector Phase 1 payloads:

- `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql`
  - legacy views `v_vault_items`, `v_vault_items_ext`, and `v_vault_items_web` still include grading fields such as `is_graded`, `grade_company`, `grade_value`, `grade_label`
  - current canonical collector projections do not use those grading fields as their primary row contract

Placeholder text:

- None found in live collector vault, public collection, or mobile collector rendering for slab badge, grader, grade, or cert number

Doc only:

- `docs/playbooks/SLAB_SYSTEM_PLAYBOOK_V1.md`
- `docs/contracts/GV_SLAB_CERT_CONTRACT_V1.md`
- `docs/contracts/GV_SLAB_PROVENANCE_CONTRACT_V1.md`
- `docs/audits/live_surface_audit_v1.md`
- `docs/audits/SLAB_CERT_IDENTITY_V1_IMPLEMENTATION_NOTE.md`
- `docs/audits/SLAB_PROVENANCE_EVENTS_V1_IMPLEMENTATION_NOTE.md`

Unrelated:

- pricing/market grade references such as `price_observations_grade_agency_check`
- `lib/card_detail_screen.dart` uses `Icons.grade` for condition display only; it is not a slab data lane
- condition/fingerprint docs that explicitly prohibit grading are not slab UI support

Explicit repo truth: slab-related fields already exist in schema and internal/admin lanes, but no live collector-facing row contract currently exposes slab badge/grader/grade/cert data.

### 3. UI Surfaces

Web vault:

- `apps/web/src/app/vault/page.tsx`
- `apps/web/src/components/vault/VaultCollectionView.tsx`
- `apps/web/src/components/vault/VaultCardTile.tsx`
- Displays image, name, set, number, condition, quantity, value, share controls, and GV-ID

Web card detail:

- `apps/web/src/app/card/[gv_id]/page.tsx`
- Displays card metadata, pricing, canonical ownership count, add-to-vault action, and condition snapshot section
- Does not render owned-object rows

Public collector/profile/collection:

- `apps/web/src/app/u/[slug]/page.tsx`
- `apps/web/src/app/u/[slug]/collection/page.tsx`
- `apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx`
- `apps/web/src/components/public/PublicCollectionGrid.tsx`
- Displays shared cards with image, name, set, number, rarity, optional note, optional back image, GV-ID

Web wall:

- `apps/web/src/app/wall/page.tsx`
- Displays recently added owned cards from a recent-activity feed

Mobile vault:

- `lib/main.dart`
- Displays image, name, set, number, condition, quantity, GV-ID, and actions for scan/increment/decrement/delete

Mobile card detail:

- `lib/card_detail_screen.dart`
- Displays summary metadata, condition, quantity, GV-ID/card id, and pricing

Internal/admin only:

- `apps/web/src/app/founder/page.tsx`
- Slab-aware, but not a collector-facing Phase 1 slab UI surface

### 4. Data Source Trace

Web vault:

- `apps/web/src/components/vault/VaultCardTile.tsx`
- -> `apps/web/src/components/vault/VaultCollectionView.tsx`
- -> `apps/web/src/app/vault/page.tsx`
- -> `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
- -> `public.vault_item_instances` as truth, plus `vault_items`, `card_prints`, and `v_vault_items_web` for compatibility metadata

Web card detail ownership:

- `apps/web/src/app/card/[gv_id]/page.tsx`
- -> `apps/web/src/lib/vault/getOwnedCountsByCardPrintIds.ts`
- -> `public.vault_item_instances`

Web card detail card metadata:

- `apps/web/src/app/card/[gv_id]/page.tsx`
- -> `apps/web/src/lib/getPublicCardByGvId.ts`
- -> `public.card_prints` and related card metadata reads

Public collector/profile/collection:

- `apps/web/src/components/public/PublicCollectionGrid.tsx`
- -> `apps/web/src/app/u/[slug]/page.tsx`
- -> `apps/web/src/app/u/[slug]/collection/page.tsx`
- -> `apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx`
- -> `apps/web/src/lib/getSharedCardsBySlug.ts`
- -> `public.shared_cards` + `public.card_prints`

Web wall:

- `apps/web/src/app/wall/page.tsx`
- -> `public.v_recently_added`

Mobile vault:

- `lib/main.dart`
- -> `lib/services/vault/vault_card_service.dart`
- -> `public.vault_mobile_collector_rows_v1()`
- -> `public.vault_item_instances` as truth, plus `vault_items`, `card_prints`, and `sets` for compatibility metadata

Mobile card detail:

- `lib/card_detail_screen.dart`
- <- summary fields passed from `lib/main.dart`
- no slab-specific loader exists

Internal/admin:

- `apps/web/src/app/founder/page.tsx`
- -> `public.vault_item_instances`
- -> `public.slab_certs`
- -> `public.card_prints`

### 5. Gaps / Risks

Real gaps:

- No slab fields in the live collector row contracts for web vault, public shared cards, or mobile vault
- Both canonical collector projections explicitly exclude slab-only instances by requiring `card_print_id is not null`
- Public shared collector surfaces are fed by `shared_cards` + `card_prints` and have no slab-aware mapping layer
- Web card detail only renders ownership count; there is no object-level owned-card block where slab metadata could appear

Real risks:

- Shape mismatch risk: `VaultCardData`, mobile row maps, and public shared-card payloads would all need slab-compatible fields before rendering can begin
- Duplicate rendering path risk: web vault, mobile vault, public shared collection, and wall do not share one slab-aware projection
- Public/private surface mismatch: collector-private vault and public shared collection are fed by different loaders
- Compatibility-anchor risk: `vault_item_id` is still used for scan/share/archive flows, so any slab visibility work must not hide or repurpose that runtime anchor

Not a real blocker:

- Phase 2 data model creation is not the blocker. Real slab fields already exist in `slab_certs` and `vault_item_instances`.

### 6. Deterministic Conclusion

Phase 1 needs a small compatibility shaping step first.

Repository evidence does not support a pure UI-only start today. The slab model already exists in schema and internal/admin reads, but the live collector payloads do not expose slab signals and the canonical collector projections currently filter slab-backed instances out. Phase 1 is therefore not blocked on Phase 2 schema work, but it is blocked on read-model shaping.

### 7. Minimum Safe Execution Target

Minimum-safe next task:

- add compatibility shaping only
- extend the collector read-models that already feed Phase 1 surfaces so they can surface existing slab signals from current repo truth

Exact minimum-safe boundary:

- web collector projection: extend `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
- mobile collector projection: extend `public.vault_mobile_collector_rows_v1()` in `supabase/migrations/20260317101500_create_mobile_vault_collector_rows_v1.sql`
- if public shared collection is included in the Phase 1 execution slice, add a slab-aware mapping layer in `apps/web/src/lib/getSharedCardsBySlug.ts`

Required shaping content only:

- include slab-backed owned rows by resolving `vault_item_instances.slab_cert_id -> slab_certs.card_print_id`
- surface existing slab attributes already present in repo truth:
  - `slab_cert_id`
  - `is_graded`
  - `grade_company` / `grader`
  - `grade_value` / `grade`
  - `grade_label`
  - `cert_number` only if sourced cleanly from `slab_certs`
- preserve current compatibility/runtime anchors such as `vault_item_id`

Do not widen beyond that boundary:

- no lifecycle changes
- no creation/conversion flows
- no archive behavior changes
- no provenance changes
- no scanner changes

## File Inventory

- `docs/playbooks/SLAB_SYSTEM_PLAYBOOK_V1.md`
- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
- `apps/web/src/app/vault/page.tsx`
- `apps/web/src/components/vault/VaultCollectionView.tsx`
- `apps/web/src/components/vault/VaultCardTile.tsx`
- `apps/web/src/app/card/[gv_id]/page.tsx`
- `apps/web/src/lib/vault/getOwnedCountsByCardPrintIds.ts`
- `apps/web/src/lib/getPublicCardByGvId.ts`
- `apps/web/src/lib/getSharedCardsBySlug.ts`
- `apps/web/src/components/public/PublicCollectionGrid.tsx`
- `apps/web/src/app/u/[slug]/page.tsx`
- `apps/web/src/app/u/[slug]/collection/page.tsx`
- `apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx`
- `apps/web/src/app/wall/page.tsx`
- `apps/web/src/app/founder/page.tsx`
- `lib/main.dart`
- `lib/card_detail_screen.dart`
- `lib/services/vault/vault_card_service.dart`
- `supabase/migrations/20260317101500_create_mobile_vault_collector_rows_v1.sql`
- `supabase/migrations/20260316104500_create_vault_item_instances_v1.sql`
- `supabase/migrations/20260316090000_create_slab_certs_v1.sql`
- `supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql`
