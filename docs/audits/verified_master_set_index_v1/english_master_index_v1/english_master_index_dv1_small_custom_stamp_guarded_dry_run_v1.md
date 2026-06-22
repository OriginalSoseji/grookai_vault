# DV1 Small Custom Stamp Guarded Dry-Run V1

Approved rollback-only dry-run execution for the Dragon Vault Stamp holo package.

## Summary

| metric | value |
| --- | --- |
| package_id | `DV1-SMALL-CUSTOM-STAMP-DRAGON-VAULT-PARENT-INSERTS` |
| package_fingerprint_sha256 | `cc55f171699052b623c36990dfd48ba9ac877e38e1dcc63f255794ab94fd9b83` |
| dry_run_status | completed_rolled_back_no_durable_change |
| target_rows | 4 |
| inserted_parent_rows_transient | 4 |
| inserted_identity_rows_transient | 4 |
| inserted_child_rows_transient | 4 |
| before_hash | `2ddfddff87e3a4ecb19776dddf47a886acabec8d0bc0f9979e1e7e3e2a49bbf2` |
| after_hash | `2ddfddff87e3a4ecb19776dddf47a886acabec8d0bc0f9979e1e7e3e2a49bbf2` |
| durable_state_unchanged | true |
| dry_run_proof_sha256 | `49ed01f0fae24e6651256a00cd06b750fa459778aa1d168f2162f9cc6f55a15b` |
| db_writes_performed | false |
| migrations_created | false |

## Scope

| set | number | card | stamp | finish | target parent | target child |
| --- | --- | --- | --- | --- | --- | --- |
| dv1 | 10 | Latios | Dragon Vault Stamp | holo | 773ab09c-ee9a-46bc-b0dc-e263ced5962f | 404c1849-f0c8-4672-b240-bc1caba8e008 |
| dv1 | 11 | Rayquaza | Dragon Vault Stamp | holo | b0337ebd-58c5-4241-a36f-a4e4139ca1eb | 6bf5ed00-3faf-4517-b21d-d65b66527403 |
| dv1 | 16 | Haxorus | Dragon Vault Stamp | holo | c5b56546-12cc-4211-b288-7531b289e5cd | dd4c9965-0592-4d28-b30e-acfa0bdcc56a |
| dv1 | 17 | Druddigon | Dragon Vault Stamp | holo | 4ad452ce-5c70-4a2d-bbf4-3487d0b2ee7c | e2d7309a-22de-473c-b506-4b53b30e73aa |

## Safety

- Transaction was rolled back.
- Durable before/after hash matched.
- No real apply.
- No migrations.
- No deletes.
- No merges.
- No unsupported cleanup.
