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
- fingerprint: `b9f5c26004b84e33111611d76d9d6596b0d924d06096d0421a27c986882242d8`
- proof_hash: `c9877e2816f07abe849c3fded0374a34bc32ca78eb0a7b6fba921bf36d5b35bf`

## Rows

| status | set | card | number | finish | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | mfb | Potion | 33 | normal | warehouse-derived/image-truth-v1/img02a-missing-display-representative/mfb/673d0e32-6748-4f2c-8de6-f76a3f3698d5/4cce9b1f132297acc8d5c2a6.jpg | https://www.tcgcollector.com/cards/42807/potion-my-first-battle-squirtle-no-010 |
| ready | mfb | Switch | 34 | normal | warehouse-derived/image-truth-v1/img02a-missing-display-representative/mfb/3df8a13f-4fb7-45db-a8b7-d174a4895f6a/68d097055b9e0ca1315e46fd.jpg | https://www.tcgcollector.com/cards/42808/switch-my-first-battle-squirtle-no-011 |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_img02c_representative_upload_apply.mjs --apply --fingerprint b9f5c26004b84e33111611d76d9d6596b0d924d06096d0421a27c986882242d8
```
