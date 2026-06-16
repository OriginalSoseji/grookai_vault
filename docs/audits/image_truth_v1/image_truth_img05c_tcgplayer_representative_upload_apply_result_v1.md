# Image Truth V1 IMG-05C TCGPlayer Representative Upload Apply Result

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

- package_id: IMG-05C-TCGPLAYER-REPRESENTATIVE-MISSING-DISPLAY-CHILD-IMAGE-UPLOAD-APPLY
- source_rows: 6
- ready_rows: 6
- blocked_rows: 0
- ready_for_real_apply: true
- fingerprint: `87e08646836993a88b53e5326881717dbd1c9bace42dfbd12a5a7b7409069087`
- proof_hash: `a763668547a11e5fb95dd51caea287c64ad2b641324c7f6f2facda0d05d0ba42`

## Rows

| status | set | card | number | finish | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | sve | Basic Grass Energy | 017 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/f096181f-30db-4541-9285-bc3d2fab9581/f2b3bbdddf2f375b75476897.jpg | https://www.tcgplayer.com/product/645286/pokemon-sve-scarlet-and-violet-energies-basic-grass-energy-017 |
| ready | sve | Basic Fire Energy | 018 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/673bed60-6219-4134-bd1e-06354dd66758/8df08431cad4ddba86052eb1.jpg | https://www.tcgplayer.com/product/645287/pokemon-sve-scarlet-and-violet-energies-basic-fire-energy-018 |
| ready | sve | Basic Water Energy | 019 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/23a1a125-eef5-44c7-afab-bd3166c4722f/da854af718d6332c1f1b44a1.jpg | https://www.tcgplayer.com/product/645288/pokemon-sve-scarlet-and-violet-energies-basic-water-energy-019 |
| ready | sve | Basic Lightning Energy | 020 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/562d3ce6-23cb-4321-a241-869e175bd31e/476129c6b6f0e6721f3e2b00.jpg | https://www.tcgplayer.com/product/645289/pokemon-sve-scarlet-and-violet-energies-basic-lightning-energy-020 |
| ready | sve | Basic Fighting Energy | 022 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/9f812de1-58c9-4bb7-a95c-30702b793385/2baf77a10427407542ebeeda.jpg | https://www.tcgplayer.com/product/645302/pokemon-sve-scarlet-and-violet-energies-basic-fighting-energy-022 |
| ready | sve | Basic Darkness Energy | 023 | reverse | warehouse-derived/image-truth-v1/img05a-tcgplayer-representative/sve/660bb736-d831-4b85-9113-f07814798c95/1e35101172e2e9bf20f53354.jpg | https://www.tcgplayer.com/product/645303/pokemon-sve-scarlet-and-violet-energies-basic-darkness-energy-023 |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_img05c_tcgplayer_representative_upload_apply.mjs --apply --fingerprint 87e08646836993a88b53e5326881717dbd1c9bace42dfbd12a5a7b7409069087
```
