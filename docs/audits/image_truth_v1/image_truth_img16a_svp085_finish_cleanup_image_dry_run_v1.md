# Image Truth V1 IMG-16A SVP085 Finish Cleanup + Image Dry Run

This is a rollback-only dry-run package for the Grey Felt Hat Pikachu `GV-PK-PR-SV-085` issue visible in Explore.

## Safety

- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- parent_writes_performed: false
- rollback_completed: true

## Summary

- master_supports_exactly_normal: true
- unsupported_child_delete_candidates: 2
- unsupported_children_deleted_in_dry_run: 2
- supported_child_image_updated_in_dry_run: 1
- dependency_rows_on_delete_candidates: 0
- proof_hash: `56d4630cc055db24ef3080e3dd7b3083bbc00a96d528c0a12a68df459e6f4b24`

## Master Evidence

| set | number | card | finish | status | sources |
| --- | --- | --- | --- | --- | --- |
| svp | 85 | Pikachu with Grey Felt Hat | normal | master_verified | pokemontcg_api, thepricedex_price_list |

## Unsupported Children

| dry run | printing | finish | dependencies |
| --- | --- | --- | --- |
| rollback_delete_verified | GV-PK-PR-SV-085-HOLO | holo | 0 |
| rollback_delete_verified | GV-PK-PR-SV-085-RH | reverse | 0 |

## Supported Child Image

| dry run | printing | finish | image status | storage path | source |
| --- | --- | --- | --- | --- | --- |
| rollback_update_verified | GV-PK-PR-SV-085-STD | normal | exact | warehouse-derived/image-truth-v1/img15a-svp-pikachu-visible-missing/svp/2e805b83-8ce7-4445-b4ec-4deab1d1ccb6/5d1a419870158d9f0544988d.jpg | https://pkmncards.com/card/pikachu-with-grey-felt-hat-scarlet-violet-promos-svp-085/ |
