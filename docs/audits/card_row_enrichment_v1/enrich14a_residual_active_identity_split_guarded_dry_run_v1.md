# ENRICH-14A Residual Active Identity Split Guarded Dry Run V1

Generated: 2026-06-15T21:10:48.509Z

Mode: guarded rollback dry-run.

## Summary

- Dry-run target rows: 1
- Blocked rows: 1
- Pass: true
- Fingerprint: `76a33fd99b15249014dca57374ae9c04a4c68045a90e1db51c5616cbc6f52723`
- DB writes performed: false
- Migrations created: false

## Target Row

| card_print_id | set | number | name | modifier | projected_hash |
| --- | --- | --- | --- | --- | --- |
| 8277ae6a-03d8-4306-aba4-16ae7e7b4e2b | basep | 1 | Pikachu |  | 3a72e3d3e31994ebf5a61fb012fa3cb7b6c7fdee8d2b68a0fc9916987f29b8ca |

## Blocked Row

| card_print_id | set | number | name | modifier | status | reason |
| --- | --- | --- | --- | --- | --- | --- |
| b82829d7-8deb-4e21-8860-989efe798c70 | basep | 1 | Pikachu | edition:first_edition | blocked_modifier_aware_identity_projection_required | Current projection omits printed_identity_modifier, so first-edition identity would collide with the normal parent. |

## Dry-Run Proof

- Before hash: `c1211710a86b17ebe5ad1db6d6fd8e17908cb939b36eec133dd398d8456b4542`
- In-transaction hash: `1cc74fe1ecd774b8ff7ecea6f43e28399ece960b7a646f4b1b7c75ef3a5f1df1`
- After rollback hash: `c1211710a86b17ebe5ad1db6d6fd8e17908cb939b36eec133dd398d8456b4542`
- Rollback restored original state: true
- Transaction changed target state: true

## Stop Findings

None.

## Approval Text

```text
Approve real ENRICH-14A-RESIDUAL-ACTIVE-IDENTITY-SPLIT apply only. Fingerprint: 76a33fd99b15249014dca57374ae9c04a4c68045a90e1db51c5616cbc6f52723. Scope: 1 active card_print_identity insert for basep/Wizards Black Star Promos Pikachu #1 normal parent 8277ae6a-03d8-4306-aba4-16ae7e7b4e2b; first-edition modifier row b82829d7-8deb-4e21-8860-989efe798c70 remains blocked pending modifier-aware identity projection. Dry-run proof: c1211710a86b17ebe5ad1db6d6fd8e17908cb939b36eec133dd398d8456b4542 == c1211710a86b17ebe5ad1db6d6fd8e17908cb939b36eec133dd398d8456b4542. No parent writes. No child writes. No deletes. No merges. No migrations. No image writes. No global apply.
```
