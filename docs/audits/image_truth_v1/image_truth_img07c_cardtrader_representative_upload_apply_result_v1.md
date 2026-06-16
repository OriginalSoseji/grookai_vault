# Image Truth V1 IMG-07C CardTrader Representative Upload Apply Result

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

- package_id: IMG-07C-CARDTRADER-REPRESENTATIVE-MISSING-DISPLAY-CHILD-IMAGE-UPLOAD-APPLY
- source_rows: 2
- ready_rows: 2
- blocked_rows: 0
- ready_for_real_apply: true
- fingerprint: `8b4943544f3b321bf039ef6413e4a8b6d72e8f34ef419eaa716e511149b9090b`
- proof_hash: `add507c7aca2de178d27ad67d867c2720df806faddd5e463ef2e01d17e977107`

## Rows

| status | set | card | number | finish | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | mep | Makuhita | 068 | cosmos | warehouse-derived/image-truth-v1/img07a-cardtrader-representative/mep/50fb9836-a3a0-4742-a29a-09671121fa56/f44de6d49655b6a2276dcc15.jpg | https://www.cardtrader.com/en/cards/383014-makuhita-cosmos-holo-mep-068-mep-black-star-promos |
| ready | mep | Chikorita | 069 | cosmos | warehouse-derived/image-truth-v1/img07a-cardtrader-representative/mep/8c4676e9-100d-4cf1-bee5-7fcbc475eade/7f7d6b1ec6ed5a5719c990c8.jpg | https://www.cardtrader.com/en/cards/383013-chikorita-cosmos-holo-mep-069-mep-black-star-promos |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_img07c_cardtrader_representative_upload_apply.mjs --apply --fingerprint 8b4943544f3b321bf039ef6413e4a8b6d72e8f34ef419eaa716e511149b9090b
```
