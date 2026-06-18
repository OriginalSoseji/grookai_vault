# CAMEO_SEARCH_V1 Refresh Insert Guarded Dry Run

Date: 2026-06-18

## Scope

Rollback-only dry run for logical-new RotomAmiti cameo rows. This proves the additive insert package only; it does not write durable DB changes.

## Summary

- Candidate rows: 60
- Inserted inside transaction: 60
- Before active cameos: 1361
- Inside active cameos: 1421
- After rollback active cameos: 1361
- Rollback proof: `35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562` == `35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562`
- Package fingerprint: `94a961633283e044ba9ec4f64f63dcab35f9fdd63e8a5039d7e9c31b8b4458ed`

## Guards

- candidate_rows_match_delta_report: true
- no_duplicate_payload_hashes: true
- no_duplicate_payload_logical_keys: true
- no_invalid_pokemon_rows: true
- no_existing_source_hash_collisions: true
- all_target_card_prints_exist: true
- no_existing_logical_cameo_collisions: true
- dry_run_proof_passed: true

## Approval String

```text
Approve real CAMEO-REFRESH-01-ROTOMAMITI-LOGICAL-NEW-INSERTS apply only. Fingerprint: 94a961633283e044ba9ec4f64f63dcab35f9fdd63e8a5039d7e9c31b8b4458ed. Scope: 60 additive cameo metadata inserts from RotomAmiti current sheet; existing preservation-review cameos excluded=38. Dry-run proof: 35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562 == 35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562. No card identity writes. No child printing writes. No Species Dex writes. No pricing writes. No image writes. No migrations. No deletes.
```

## Confirmations

- No durable DB writes.
- No migrations.
- No card identity changes.
- No child printing changes.
- No Species Dex changes.
- No pricing changes.
- No image writes.
