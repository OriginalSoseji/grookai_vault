# IMG-MEP-FINAL-EXACT-HOLO-IMAGE-REPAIR-V1 Result

Generated: 2026-10-26T15:11:35.381Z

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
- image_status: exact
- expected_project_ref: ycdxbpibncqcchqiihfz
- database_project_ref: ycdxbpibncqcchqiihfz
- http_project_ref: ycdxbpibncqcchqiihfz
- project_ref_verified: true
- environment_invariants_passed: true

## Summary

- source_rows: 3
- ready_rows: 3
- blocked_rows: 0
- ready_for_real_apply: true
- storage_uploaded_rows: 3
- db_updated_rows: 3
- fingerprint: `b367949ddd84e4bd084a850db043c7d4994a03c05ae07c23ce76e5790b945d4a`
- proof_hash: `766fdfbdaa070982105e436bf6bf80dc125e496d07891ec7f94859b1b79ea398`

## Rows

| status | set | card | number | printing | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | mep | Mega Clefable ex | 072 | GV-PK-MEP-072-HOLO | warehouse-derived/image-truth-v1/mep-final-exact/mep/gv-pk-mep-072-holo/4e2efae1ee020cbb2690c698.jpg | https://www.tcgplayer.com/product/696607/pokemon-me-mega-evolution-promo-mega-clefable-ex-072 |
| ready | mep | Mega Gengar ex | 073 | GV-PK-MEP-073-HOLO | warehouse-derived/image-truth-v1/mep-final-exact/mep/gv-pk-mep-073-holo/74ab9fbd4473c96ac343f844.jpg | https://www.tcgplayer.com/product/696608/pokemon-me-mega-evolution-promo-mega-gengar-ex-073 |
| ready | mep | Zarude | 088 | GV-PK-MEP-088-HOLO | warehouse-derived/image-truth-v1/mep-final-exact/mep/gv-pk-mep-088-holo/08d6d68f0bca8d75948780a8.jpg | https://www.tcgplayer.com/product/706193/pokemon-me-mega-evolution-promo-zarude-088 |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_mep_final_exact_image_apply.mjs --apply --fingerprint b367949ddd84e4bd084a850db043c7d4994a03c05ae07c23ce76e5790b945d4a
```

## Evidence

TCGCSV product identity must resolve to the listed TCGPlayer product for MEP 072 Mega Clefable ex, MEP 073 Mega Gengar ex, and MEP 088 Zarude. Each live price subtype must include Holofoil, and every exact product image was manually reviewed against its printed name and number before packet generation.
