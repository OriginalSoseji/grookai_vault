# Image Truth V1 IMG-05B TCGPlayer Representative Storage Readiness

This is a no-upload, no-DB-write readiness packet for the IMG-05A TCGPlayer representative child-image candidates.

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
- proof_hash: `ec03973b90e561f92ce1ac1a52adea4d4f6bbf1e3de03dbba96c1748e87d4a1a`

## Rows

| status | set | card | number | finish | storage path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | sve | Basic Grass Energy | 017 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/f096181f-30db-4541-9285-bc3d2fab9581/f2b3bbdddf2f375b75476897.jpg | https://www.tcgplayer.com/product/645286/pokemon-sve-scarlet-and-violet-energies-basic-grass-energy-017 |
| ready | sve | Basic Fire Energy | 018 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/673bed60-6219-4134-bd1e-06354dd66758/8df08431cad4ddba86052eb1.jpg | https://www.tcgplayer.com/product/645287/pokemon-sve-scarlet-and-violet-energies-basic-fire-energy-018 |
| ready | sve | Basic Water Energy | 019 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/23a1a125-eef5-44c7-afab-bd3166c4722f/da854af718d6332c1f1b44a1.jpg | https://www.tcgplayer.com/product/645288/pokemon-sve-scarlet-and-violet-energies-basic-water-energy-019 |
| ready | sve | Basic Lightning Energy | 020 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/562d3ce6-23cb-4321-a241-869e175bd31e/476129c6b6f0e6721f3e2b00.jpg | https://www.tcgplayer.com/product/645289/pokemon-sve-scarlet-and-violet-energies-basic-lightning-energy-020 |
| ready | sve | Basic Fighting Energy | 022 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/9f812de1-58c9-4bb7-a95c-30702b793385/2baf77a10427407542ebeeda.jpg | https://www.tcgplayer.com/product/645302/pokemon-sve-scarlet-and-violet-energies-basic-fighting-energy-022 |
| ready | sve | Basic Darkness Energy | 023 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/660bb736-d831-4b85-9113-f07814798c95/1e35101172e2e9bf20f53354.jpg | https://www.tcgplayer.com/product/645303/pokemon-sve-scarlet-and-violet-energies-basic-darkness-energy-023 |

## Next Gate

If approved later, the apply sequence must upload exactly these local assets to `user-card-images`, then update only the matching `public.card_printings` image fields with representative image status after a fresh target recheck.
