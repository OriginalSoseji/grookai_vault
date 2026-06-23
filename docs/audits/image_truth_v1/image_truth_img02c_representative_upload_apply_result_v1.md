# Image Truth V1 IMG-02C Representative Upload Apply Result

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

- package_id: IMG-02C-MISSING-DISPLAY-REPRESENTATIVE-CHILD-IMAGE-UPLOAD-APPLY
- source_rows: 1
- ready_rows: 1
- blocked_rows: 0
- ready_for_real_apply: true
- fingerprint: `77bdfbb1a17eb7853246841b228020ae782597497b05ff2031406a760c69f38d`
- proof_hash: `d6b5f9941839a9f31f1e3e7209980ebd6f3d66baa14ddd7610d6331c6f002494`

## Rows

| status | set | card | number | finish | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | misc | Ancient Mew | 1 | cosmos | warehouse-derived/image-truth-v1/img02a-missing-display-representative/misc/d91be6d3-58f8-4ebc-a3e7-e9b58b391e8d/ed6b7c57813a1520c1922384.jpg | https://www.pricecharting.com/game/pokemon-promo/ancient-mew |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_img02c_representative_upload_apply.mjs --apply --fingerprint 77bdfbb1a17eb7853246841b228020ae782597497b05ff2031406a760c69f38d
```
