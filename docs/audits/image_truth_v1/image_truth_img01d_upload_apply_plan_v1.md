# Image Truth V1 IMG-01D Upload Apply Plan

## Safety

- mode: plan_only
- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- target_table: card_printings
- parent_overwrite_allowed: false
- storage_bucket: user-card-images

## Summary

- package_id: IMG-01D-MISSING-DISPLAY-EXACT-CHILD-IMAGE-UPLOAD-APPLY
- source_rows: 1
- ready_rows: 1
- blocked_rows: 0
- ready_for_real_apply: true
- fingerprint: `5a7dd2b3538db19361502672f3bd273bfac300437bbb71e7bf54b1d5ec4b9e1a`
- proof_hash: `-`

## Rows

| status | set | card | number | finish | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | mee | Basic Grass Energy | 001 | reverse | warehouse-derived/image-truth-v1/img01b-missing-display/mee/48e37111-db45-4c3e-9331-eb502378cb24/997886f1017668bc97324532.jpg | https://www.pricecharting.com/game/pokemon-mega-evolution-energy/basis-energy-grass-reverse-holo-1 |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_img01d_upload_apply.mjs --apply --fingerprint 5a7dd2b3538db19361502672f3bd273bfac300437bbb71e7bf54b1d5ec4b9e1a
```
