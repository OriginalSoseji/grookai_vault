# E3 Japanese-Back Guarded Dry Run V1

Rollback-only dry-run for source-backed Expedition E3 Japanese-back special prints.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- deletes_performed: false
- merges_performed: false
- rollback_verified: true

## Targets

| set | number | name | variant | finish | base_parent | base_finishes |
| --- | --- | --- | --- | --- | --- | --- |
| ecard1 | 112 | Hoppip | japanese_card_back | normal | 3d2e174e-ed44-4a72-a58f-7f48dea42b60 | normal, reverse |
| ecard1 | 58 | Pichu | japanese_card_back | normal | cac4a8a6-8baf-4d28-a015-4c3545255aa9 | normal, reverse |

## Correction

- Pichu Japanese-back is modeled as Expedition `#58 normal`.
- The stale `#22 holo` candidate is not inserted.

## Result

- dry_run_status: e3_japanese_back_parent_child_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `cd9334d4d64cb920c3ff69dc4166b3beb5171e03b46db1d8058cb93c368003f2`
- sql_hash_sha256: `ef51193a828361d9c56d46ada8f5548b5ac9f99573fc554cfb60fb3b1ec7df42`
- dry_run_proof_sha256: `0710338cb1fc3bfa6acc984ae95b71b3dc5512e5c5d67d3266de451925d60dc1`
- stop_findings: 0

## Approval Text

```text
Approve real MISSING-PROMO-04C-E3-JAPANESE-BACK-PARENT-CHILD-INSERTS apply only. Fingerprint: cd9334d4d64cb920c3ff69dc4166b3beb5171e03b46db1d8058cb93c368003f2. SQL hash: ef51193a828361d9c56d46ada8f5548b5ac9f99573fc554cfb60fb3b1ec7df42. Scope: 2 E3 Japanese-back parent inserts, 2 active identity inserts, 2 normal child printing inserts for ecard1/Expedition Hoppip #112 and corrected Pichu #58; variant_key=japanese_card_back; printed_identity_modifier=japanese_card_back; stale Pichu #22 holo candidate excluded. Dry-run proof: 583533f7031eb5c7297642e5d83fa2d64b2bf4f4f6a5610264b3ef5dedb9143a == 583533f7031eb5c7297642e5d83fa2d64b2bf4f4f6a5610264b3ef5dedb9143a. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No external mapping writes. No pricing writes. No image writes.
```
