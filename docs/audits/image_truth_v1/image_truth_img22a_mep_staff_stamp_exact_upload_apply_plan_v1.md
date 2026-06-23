# IMG-22A-MEP-STAFF-STAMP-EXACT-CHILD-IMAGE-UPLOAD-APPLY Plan

Generated: 2026-06-23T04:22:59.411Z

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
- image_status: exact

## Summary

- source_rows: 2
- ready_rows: 2
- blocked_rows: 0
- ready_for_real_apply: true
- storage_uploaded_rows: 0
- db_updated_rows: 0
- fingerprint: `f4d14f0f99d07d7b6630a81a562474503189e157289c0c20305aabfd333e238a`
- proof_hash: `-`

## Rows

| status | set | card | number | printing | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | mep | Serperior | 064 | GV-PK-MEP-064-STAFF-STAMP-HOLO | warehouse-derived/image-truth-v1/img22a-mep-staff-stamp-exact/mep/gv-pk-mep-064-staff-stamp-holo/38a7473fcd2a43b84ca64b7e.jpg | https://www.tcgplayer.com/product/685498/pokemon-me-mega-evolution-promo-serperior-064-staff |
| ready | mep | Doublade | 067 | GV-PK-MEP-067-STAFF-STAMP-HOLO | warehouse-derived/image-truth-v1/img22a-mep-staff-stamp-exact/mep/gv-pk-mep-067-staff-stamp-holo/061ad22c5dea5ec493d817d8.jpg | https://www.tcgplayer.com/product/685501/pokemon-me-mega-evolution-promo-doublade-067-staff |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_img22a_mep_staff_stamp_exact_upload_apply.mjs --apply --fingerprint f4d14f0f99d07d7b6630a81a562474503189e157289c0c20305aabfd333e238a
```

## Evidence

TCGCSV live product titles must include [Staff], TCGCSV live price subtypes must include Holofoil, and the product images were manually visually reviewed before packet generation for visible STAFF stamps.
