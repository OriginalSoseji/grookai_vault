# Image Truth V1 IMG-06B XYA PKMNCards Representative Storage Readiness

This is a no-upload, no-DB-write readiness packet for the IMG-06A XYA PKMNCards representative child-image candidates.

## Safety

- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- target_table: card_printings
- parent_overwrite_allowed: false
- storage_bucket: user-card-images

## Summary

- source_rows: 6
- ready_for_storage_upload_rows: 6
- blocked_rows: 0
- db_rows_with_any_image_field: 0
- storage_collision_rows: 0
- local_asset_mismatch_rows: 0
- ready_for_upload_then_apply: true
- proof_hash: `78c80be535fa1e7fc1a54a3a4540f80599bf2e4ab9d03824ce517718236d63a1`

## Rows

| status | set | card | number | finish | storage path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | xya | Professor Sycamore | 107a | normal | warehouse-derived/image-truth-v1/img06a-xya-pkmncards-representative/xya/d64bb458-7f36-41f3-aec6-c975e6c31787/d9c8547118d2f4a13821a070.jpg | https://pkmncards.com/card/professor-sycamore-breakpoint-bkp-107a/ |
| ready | xya | M Manectric-EX | 24a | normal | warehouse-derived/image-truth-v1/img06a-xya-pkmncards-representative/xya/a734f785-a82e-4bd1-a536-5e19e973fe0c/6e2caedf630852d00b78c2a7.jpg | https://pkmncards.com/card/m-manectric-ex-phantom-forces-phf-24a/ |
| ready | xya | Jolteon-EX | 28a | normal | warehouse-derived/image-truth-v1/img06a-xya-pkmncards-representative/xya/d9e75342-92ef-4868-87db-fc0a0ae002d2/5bd3ba14eb9092985174056c.jpg | https://pkmncards.com/card/jolteon-ex-generations-gen-28a/ |
| ready | xya | Zygarde-EX | 54a | normal | warehouse-derived/image-truth-v1/img06a-xya-pkmncards-representative/xya/63fbd93e-1d9c-4495-b82c-8638e397f805/6d1c5a22e1069e35ee109ac6.jpg | https://pkmncards.com/card/zygarde-ex-fates-collide-fco-54a/ |
| ready | xya | M Lucario-EX | 55a | normal | warehouse-derived/image-truth-v1/img06a-xya-pkmncards-representative/xya/9acd6ae4-47c3-48a3-aa69-983cad544d82/7a18771422845566c4cda767.jpg | https://pkmncards.com/card/m-lucario-ex-furious-fists-ffi-55a/ |
| ready | xya | Trainers’ Mail | 92a | normal | warehouse-derived/image-truth-v1/img06a-xya-pkmncards-representative/xya/d97feec7-3d80-49d1-bbfe-6ca80fb2df99/a216f7d66d1a730553ab9da6.jpg | https://pkmncards.com/card/trainers-mail-roaring-skies-ros-92a/ |

## Next Gate

If approved later, the apply sequence must upload exactly these local assets to `user-card-images`, then update only the matching `public.card_printings` image fields with representative image status after a fresh target recheck.
