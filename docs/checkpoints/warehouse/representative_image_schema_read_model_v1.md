# Representative Image Schema Read Model V1

Status: COMPLETE  
Scope: schema + read-model foundation only  
Updated: 2026-04-16

## Purpose

Align the database and active read surfaces with `REPRESENTATIVE_IMAGE_CONTRACT_V1` without:

- writing representative images
- changing UI behavior
- changing identity

## Schema Changes

Migration:

- `supabase/migrations/20260416160247_representative_image_schema_v1.sql`

Added columns on `public.card_prints`:

- `representative_image_url text null`
- `image_note text null`

Expanded `image_status` constraint to allow:

- `exact`
- `representative_shared`
- `representative_shared_collision`
- `representative_shared_stamp`
- `missing`
- `unresolved`

Compatibility values still temporarily allowed:

- `ok`
- `placeholder`
- `user_uploaded`

## Deterministic Status Normalization

Applied bounded repair only where mapping was deterministic:

1. rows with a lawful exact image lane and `image_status in (null, '', 'ok')`
   -> `image_status = 'exact'`
2. rows with no exact image and no representative image and `image_status in (null, '')`
   -> `image_status = 'missing'`

No representative statuses were written in this pass.

## Live Status Snapshot

Post-migration live vocabulary:

- `exact`: 23,877
- `missing`: 901

Legacy `ok` / null buckets were collapsed by the deterministic repair on the current DB.

## Read Surfaces Extended

Web:

- `apps/web/src/lib/publicSets.ts`
- `apps/web/src/lib/getPublicCardByGvId.ts`
- `apps/web/src/lib/getAdjacentPublicCardsByGvId.ts`
- `apps/web/src/lib/cards/getPublicCardsByGvIds.ts`
- `apps/web/src/lib/cards/getFeaturedExploreCards.ts`
- `apps/web/src/lib/explore/getExploreRows.ts`
- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
- `apps/web/src/lib/warehouse/buildFounderPromotionReview.ts`
- shared types in:
  - `apps/web/src/lib/publicSets.shared.ts`
  - `apps/web/src/types/cards.ts`

Flutter model alignment:

- `lib/models/card_print.dart`
- `lib/services/vault/vault_card_service.dart`
- `lib/card_detail_screen.dart`

## Read Model Shape

Active read surfaces can now expose:

- `image_url` (exact image lane)
- `representative_image_url`
- `image_status`
- `image_note`
- `image_source`
- `display_image_url`
- `display_image_kind`

Read-time rule:

1. exact image first
2. otherwise representative image
3. otherwise missing

## Perfect Order Proof

`me03` remains image-safe after this pass:

- `card_prints where set_code = 'me03'`: 130
- exact image rows: 0
- representative image rows: 0
- `image_status = 'missing'`: 130

Sample `GV-PK-ME03-001` read result:

- `image_url = null`
- `representative_image_url = null`
- `image_status = 'missing'`
- `display_image_url = null`
- `display_image_kind = 'missing'`

## Verification

Passed:

- web typecheck
- remote migration apply
- current DB proof queries

Blocked in this environment:

- `supabase db reset --local --no-seed`
- `supabase db push --local`

Reason:

- Docker Desktop / local Postgres is not running

Flutter validation:

- no new errors in touched files
- narrow analyze still reports pre-existing `unnecessary_cast` warnings in `lib/models/card_print.dart`
- full `flutter analyze` still reports unrelated pre-existing scanner/test failures outside this pass

## Non-Goals Preserved

This pass did not:

- write any representative image
- change any UI rendering
- modify any identity truth
- reopen Perfect Order canon/mapping logic
