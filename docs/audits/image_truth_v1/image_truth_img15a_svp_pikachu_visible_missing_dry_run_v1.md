# Image Truth V1 IMG-15A SVP Pikachu Visible Missing Dry Run

This is a rollback-only dry-run package for the visible missing SVP Pikachu image rows found in Explore.

## Safety

- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- target_table: card_printings
- parent_overwrite_allowed: false
- package_id: IMG-15A-SVP-PIKACHU-VISIBLE-MISSING-CHILD-IMAGE-DRY-RUN

## Summary

- source_rows: 3
- dry_run_ready_rows: 3
- blocked_rows: 2
- rollback_completed: true
- proof_hash: `066d96ff4158ad03995d36830ae04b1c75ea38ad20e7d2cc220e0d70d3586d63`

## Dry-Run Rows

| status | gv id | printing | card | number | finish | confidence | storage path | source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rollback_update_verified | GV-PK-PR-SV-085 | GV-PK-PR-SV-085-STD | Pikachu with Grey Felt Hat | 085 | normal | exact | warehouse-derived/image-truth-v1/img15a-svp-pikachu-visible-missing/svp/2e805b83-8ce7-4445-b4ec-4deab1d1ccb6/5d1a419870158d9f0544988d.jpg | https://pkmncards.com/card/pikachu-with-grey-felt-hat-scarlet-violet-promos-svp-085/ |
| rollback_update_verified | GV-PK-PR-SV-190 | GV-PK-PR-SV-190-STD | Pikachu | 190 | normal | exact | warehouse-derived/image-truth-v1/img15a-svp-pikachu-visible-missing/svp/c8f42393-c642-4d54-b033-b2174f2b4e4e/317f51d07cda8d0d8c7ffe88.jpg | https://pkmncards.com/card/pikachu-scarlet-violet-promos-svp-190/ |
| rollback_update_verified | GV-PK-PR-SV-214 | GV-PK-PR-SV-214-STD | Pikachu | 214 | normal | exact | warehouse-derived/image-truth-v1/img15a-svp-pikachu-visible-missing/svp/7fe6c78d-ff07-4a48-b828-04983b3337ef/9ff6219898a92fb2302646cc.jpg | https://pkmncards.com/card/pikachu-scarlet-violet-promos-svp-214/ |

## Blocked / Already Covered Rows

| reason | gv id | printing | card | number | finish | notes |
| --- | --- | --- | --- | --- | --- | --- |
| identity_finish_review_required_before_image_promotion | GV-PK-PR-SV-225 | GV-PK-PR-SV-225-RH | Pikachu | 225 | reverse | Current row is modeled as base/reverse, while external evidence describes SVP 225 as a 2025 World Championships promo lane with stamp/winner variant evidence. |
| already_has_child_image_path | GV-PK-PR-SV-85 | GV-PK-PR-SV-85-STD | Pikachu with Grey Felt Hat | 85 | normal | Existing IMG-03C PKMNCards representative child image is already stored on the child row; this package does not rewrite it. |
