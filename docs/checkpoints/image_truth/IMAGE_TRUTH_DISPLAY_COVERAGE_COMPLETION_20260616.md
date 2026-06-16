# Image Truth Display Coverage Completion

Date: 2026-06-16

This checkpoint records the Image Truth V1 display-coverage state after the approved missing-display image upload packages were applied.

## Scope

```text
domain: English physical only
target_table: card_printings
parent_image_overwrites: false
db_writes_performed_in_checkpoint: true
db_write_scope: child card_printings image fields only
migrations_created: false
deletes_performed: false
merges_performed: false
global_apply_performed: false
```

The work targeted child printing display coverage only. It did not change parent image fields.

## Applied Since Readiness

### IMG-01D Exact Image Apply

```text
package: IMG-01D-MISSING-DISPLAY-EXACT-CHILD-IMAGE-UPLOAD-APPLY
fingerprint: 5a7dd2b3538db19361502672f3bd273bfac300437bbb71e7bf54b1d5ec4b9e1a
scope: 1 exact child image upload/update
target: mee Basic Grass Energy #001 reverse
source: PriceCharting exact reverse-holo page
post_apply_proof_hash: 5387a0b88f4f7dabb4659ebc029ec345debda0bcf7994e582b1f039e9942605e
```

### IMG-02C MFB Pokemon Representative Apply

```text
package: IMG-02C-MISSING-DISPLAY-REPRESENTATIVE-CHILD-IMAGE-UPLOAD-APPLY
fingerprint: f1209de8b64b9851a8a3c4ed1af7a9319bda785277d2c55c686951d4a67b69e0
scope: 28 representative child image uploads/updates
target: mfb My First Battle Pokemon rows
source: preserved PriceCharting product-page evidence
post_apply_proof_hash: 7dbbb95e2dedfc68504af8b4c621bbae239ba0069e73c87e76ace2696c0739cb
```

### IMG-02C MFB Energy Representative Apply

```text
package: IMG-02C-MISSING-DISPLAY-REPRESENTATIVE-CHILD-IMAGE-UPLOAD-APPLY
fingerprint: 856d04a382e0d6c5940ede418d45918e837d492b26d70ffcecfe622336a52d0a
scope: 4 representative child image uploads/updates
targets: mfb Grass Energy #8, Fire Energy #16, Lightning Energy #24, Water Energy #32
source: preserved PriceCharting base energy product-page evidence
post_apply_proof_hash: 15903ab212cb06b6a42d8590df70dde3c31d7bd5557ce1480793e0cdbd8bfbfc
```

### IMG-02C MFB Trainer Representative Apply

```text
package: IMG-02C-MISSING-DISPLAY-REPRESENTATIVE-CHILD-IMAGE-UPLOAD-APPLY
fingerprint: b9f5c26004b84e33111611d76d9d6596b0d924d06096d0421a27c986882242d8
scope: 2 representative child image uploads/updates
targets: mfb Potion #33 normal, mfb Switch #34 normal
source: TCGCollector card pages with preserved static image URLs
storage_readiness_proof_hash: a2f9a2d4cdce351815d6552e1a4c156fbd1d7647d4aff326702bef810971b930
dry_run_proof_hash: e3bf5606b8f5407556d27aa590b8d61406d2f0d94119744e432be821a5083bee
post_apply_proof_hash: c9877e2816f07abe849c3fded0374a34bc32ca78eb0a7b6fba921bf36d5b35bf
```

## Current Display Coverage

Current audit:

```text
docs/audits/image_truth_v1/image_truth_audit_v1.json
docs/audits/image_truth_v1/image_truth_missing_display_source_packet_v1.json
```

Current metrics:

```text
english_physical_child_printings: 38,111
english_physical_display_covered_rows: 38,111
english_physical_missing_display_rows: 0
english_physical_exact_rows: 23,178
english_physical_representative_rows: 432
english_physical_missing_variant_visual_rows: 14,501
```

English physical display coverage is complete. Some rows are representative rather than exact; this is intentional and encoded in image confidence/status fields.

## Final Missing-Display Closure

The final two missing-display rows were closed as representative images, not exact variant images.

| Set | Number | Card | Finish | printing_gv_id | card_printing_id | Image Status |
| --- | --- | --- | --- | --- | --- | --- |
| mfb | 33 | Potion | normal | GV-PK-MFB-33-STD | 673d0e32-6748-4f2c-8de6-f76a3f3698d5 | representative_shared |
| mfb | 34 | Switch | normal | GV-PK-MFB-34-STD | 3df8a13f-4fb7-45db-a8b7-d174a4895f6a | representative_shared |

Source URLs preserved:

```text
Potion: https://www.tcgcollector.com/cards/42807/potion-my-first-battle-squirtle-no-010
Switch: https://www.tcgcollector.com/cards/42808/switch-my-first-battle-squirtle-no-011
```

The live PriceCharting pages tested for these rows resolved to generic list pages and were rejected:

```text
https://www.pricecharting.com/game/pokemon-my-first-battle/potion
title: Potion Prices | Potion List

https://www.pricecharting.com/game/pokemon-my-first-battle/switch
title: Switch Prices | Switch List
```

Those were not safe product pages for image promotion.

## Variant Safety Finding

MFB Potion and Switch now have representative images from TCGCollector card pages. They are not marked exact because the Grookai rows are base identities:

```text
printed_identity_modifier: null
variant_key_current: base
```

Do not present these as exact base identity images. They are display-safe representative images only.

Safe future options:

1. Add governed deck-specific identity modifiers first, then attach deck-specific images to those modifier parents.
2. Promote a source to exact only if it proves the exact base identity image.
3. Keep the current representative display policy and label confidence honestly.

## Resume Instructions

If resuming Image Truth V1 from this checkpoint:

1. Regenerate the image audit and missing-display source packet.
2. Confirm the English physical missing-display count is still 0 before touching any package logic.
3. Do not promote representative Potion or Switch imagery to exact unless exact base identity evidence exists.
4. Keep all image writes child-only on `card_printings`.
5. Preserve source URL, image confidence, and notes.
6. Require dry-run proof before any DB write.

Recommended next task:

```text
Continue exact-variant image acquisition from image_truth_exact_variant_readiness_v1.json.
```

The display-coverage phase is complete. The remaining image work is exact-variant improvement, not missing-display repair.

## Verification

Commands run after the latest apply:

```text
node --test tests/contracts/contract_scope_v1.test.mjs
git diff --check
git status --short -- supabase\migrations
npm run preflight
```

Results:

```text
contract_scope_v1: passed
git_diff_check: passed
supabase_migrations_status: clean
npm_preflight: PASS_WITH_DEFERRED_DEBT
critical_failures: 0
```

Known deferred debt remains outside this checkpoint's scope.
