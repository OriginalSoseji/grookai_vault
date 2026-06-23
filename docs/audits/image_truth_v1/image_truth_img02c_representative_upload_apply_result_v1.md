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
- source_rows: 2
- ready_rows: 2
- blocked_rows: 0
- ready_for_real_apply: true
- fingerprint: `ab007c2a2cea610145a142ab24285f5c079d124503abf783928bd4a921659d45`
- proof_hash: `53f3ff5aecdc5703947858178294ed1b13f80797095f49eb6d91256ca65e7b00`

## Rows

| status | set | card | number | finish | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | tk-xy-w | Fairy Energy | 3 | normal | warehouse-derived/image-truth-v1/img02a-missing-display-representative/tk-xy-w/383f508c-ceb4-4cc9-88af-c77c8c330ab3/431646896f4c86c28df738fd.jpg | https://pkmncards.com/card/fairy-energy-xy-trainer-kit-wigglytuff-tk7b-3/ |
| ready | tk-xy-w | Sentret | 4 | normal | warehouse-derived/image-truth-v1/img02a-missing-display-representative/tk-xy-w/0bedb87a-1058-469a-ae15-1c3a8d7e3d8e/ee150af2d06a0e4477cf5b8a.jpg | https://pkmncards.com/card/sentret-xy-trainer-kit-wigglytuff-tk7b-4/ |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_img02c_representative_upload_apply.mjs --apply --fingerprint ab007c2a2cea610145a142ab24285f5c079d124503abf783928bd4a921659d45
```
