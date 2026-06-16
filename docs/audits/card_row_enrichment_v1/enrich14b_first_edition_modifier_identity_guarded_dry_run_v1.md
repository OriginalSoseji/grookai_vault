# ENRICH-14B First Edition Modifier Identity Guarded Dry Run V1

Generated: 2026-06-15T21:22:47.173Z

Mode: guarded rollback dry-run.

## Summary

- Target rows: 1
- Target card print: `b82829d7-8deb-4e21-8860-989efe798c70`
- Modifier: `edition:first_edition`
- Pass: true
- Fingerprint: `37199872ac28e5e1f4dbe3b068ed621cd600a975ca45bf1425ca833b8aaa29ec`
- DB writes performed: false
- Migrations created: false

## Identity Strategy

The existing `pokemon_eng_standard:v1` identity hash law only approves `variant_key_current` as a domain dimension. This dry-run keeps the parent row untouched and inserts only an active identity row whose payload carries:

```json
{
  "printed_total": 53,
  "printed_set_abbrev": "PR",
  "variant_key_current": "edition:first_edition"
}
```

## Hash Comparison

- Base projection hash: `3a72e3d3e31994ebf5a61fb012fa3cb7b6c7fdee8d2b68a0fc9916987f29b8ca`
- Modifier-aware hash: `fd96d3a6f0f2c1ee32e09b69f5dfebaeade11c3640694aea75179a085c8808d5`

## Dry-Run Proof

- Before hash: `26ba580ad57299be5d26bec565317b6d6a0d2e91bdbb385e16cd4d4cfda575ad`
- In-transaction hash: `d4dfa059b6c40f9b7abacff3fc91747a23555eb296b8d8e2c5b8199fe1bb3c83`
- After rollback hash: `26ba580ad57299be5d26bec565317b6d6a0d2e91bdbb385e16cd4d4cfda575ad`
- Rollback restored original state: true
- Transaction changed target state: true

## Inserted Row Inside Rolled-Back Transaction

| card_print_id | identity_domain | identity_key_version | identity_key_hash |
| --- | --- | --- | --- |
| b82829d7-8deb-4e21-8860-989efe798c70 | pokemon_eng_standard | pokemon_eng_standard:v1 | fd96d3a6f0f2c1ee32e09b69f5dfebaeade11c3640694aea75179a085c8808d5 |

## Stop Findings

None.

## Approval Text

```text
Approve real ENRICH-14B-FIRST-EDITION-MODIFIER-IDENTITY apply only. Fingerprint: 37199872ac28e5e1f4dbe3b068ed621cd600a975ca45bf1425ca833b8aaa29ec. Scope: 1 modifier-aware active card_print_identity insert for basep/Wizards Black Star Promos Pikachu #1 first-edition parent b82829d7-8deb-4e21-8860-989efe798c70; identity payload variant_key_current=edition:first_edition; normal parent 8277ae6a-03d8-4306-aba4-16ae7e7b4e2b preserved. Dry-run proof: 26ba580ad57299be5d26bec565317b6d6a0d2e91bdbb385e16cd4d4cfda575ad == 26ba580ad57299be5d26bec565317b6d6a0d2e91bdbb385e16cd4d4cfda575ad. No parent writes. No child writes. No deletes. No merges. No migrations. No image writes. No global apply.
```
