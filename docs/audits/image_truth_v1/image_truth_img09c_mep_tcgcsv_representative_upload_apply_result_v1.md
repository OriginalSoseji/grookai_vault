# Image Truth V1 IMG-09C MEP TCGCSV Representative Upload Apply Result

## Safety

- mode: real_apply
- db_writes_performed: true
- storage_uploads_performed: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- target_table: card_printings
- parent_overwrite_allowed: false
- storage_bucket: user-card-images
- image_status: representative_shared

## Summary

- package_id: IMG-09C-MEP-TCGCSV-REPRESENTATIVE-MISSING-DISPLAY-CHILD-IMAGE-UPLOAD-APPLY
- source_rows: 2
- ready_rows: 2
- blocked_rows: 0
- ready_for_real_apply: true
- fingerprint: `158449ea9af2671295ffcee121dc45c0f6ad99a9e01718c25826389e83dd19f0`
- proof_hash: `af6472fc0b9362951d8596e67972da87a87912778a3a40e151762c6a2674d45e`

## Rows

| status | set | card | number | finish | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | mep | Barbaracle | 065 | holo | warehouse-derived/image-truth-v1/img09a-mep-tcgcsv-representative/mep/2c76b426-bdda-42ce-85d8-a921e79de026/3150be3f71585a9b7de999dc.jpg | https://www.tcgplayer.com/product/685495/pokemon-me-mega-evolution-promo-barbaracle-065 |
| ready | mep | Tyrantrum | 066 | holo | warehouse-derived/image-truth-v1/img09a-mep-tcgcsv-representative/mep/ed4ce9f8-9703-492e-919c-3ec19d1f493a/9cd56f1884565b0397087ea7.jpg | https://www.tcgplayer.com/product/685496/pokemon-me-mega-evolution-promo-tyrantrum-066 |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_img09c_mep_tcgcsv_representative_upload_apply.mjs --apply --fingerprint 158449ea9af2671295ffcee121dc45c0f6ad99a9e01718c25826389e83dd19f0
```
