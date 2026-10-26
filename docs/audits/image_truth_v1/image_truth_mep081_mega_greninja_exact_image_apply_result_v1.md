# IMG-MEP081-MEGA-GRENINJA-EXACT-HOLO-IMAGE-REPAIR-V1 Result

Generated: 2026-10-26T07:13:47.649Z

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

## Summary

- source_rows: 1
- ready_rows: 1
- blocked_rows: 0
- ready_for_real_apply: true
- storage_uploaded_rows: 1
- db_updated_rows: 1
- fingerprint: `0d592d667150ffa83c6738da3bbc02f7dd673bfee6632c53e7257de3d4d9e166`
- proof_hash: `ccf278c1e7fd50ef8da278a71bdf6bae174d30725ceb1ffa5ab97aa73434968e`

## Rows

| status | set | card | number | printing | image_path | source |
| --- | --- | --- | --- | --- | --- | --- |
| ready | mep | Mega Greninja ex | 081 | GV-PK-MEP-081-HOLO | warehouse-derived/image-truth-v1/mep081-mega-greninja-exact/mep/gv-pk-mep-081-holo/12efc90500700f0567fc9754.jpg | https://www.tcgplayer.com/product/704879/pokemon-me-mega-evolution-promo-mega-greninja-ex-081 |

## Approval Command

```powershell
node scripts/audits/image_truth_v1_mep081_mega_greninja_exact_image_apply.mjs --apply --fingerprint 0d592d667150ffa83c6738da3bbc02f7dd673bfee6632c53e7257de3d4d9e166
```

## Evidence

TCGCSV product identity must resolve to TCGPlayer product 704879, MEP 081, Mega Greninja ex. The live price subtype must include Holofoil, and the exact product image was manually reviewed for the standard-size MEP 081 card before packet generation.
