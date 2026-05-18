# Grookai Dex V1 Contract

Status: Draft
Date: 2026-05-18

## Purpose

Grookai Dex is the canonical app feature for Pokemon species collection progress.

It answers:

```text
For this user, how many card prints for this Pokemon are owned?
```

Example:

```text
Pikachu 20 / 200
```

## Contract Summary

Grookai Dex V1 must use:

- `pokemon_species` as the species catalogue
- `card_print_species` as the species-to-print mapping
- `card_prints` as the card print catalogue
- `vault_item_instances` as active ownership truth

Grookai Dex V1 must not use:

- public shared cards as ownership truth
- `vault_items.qty` as ownership truth
- live substring matching as canonical species membership
- scanner outputs
- pricing tables for completion

## Naming

Feature name:

```text
Grookai Dex
```

Primary route names:

```text
/dex
/dex/[speciesSlug]
```

Internal contract prefix:

```text
grookai_dex_v1
```

## Canonical Definitions

### Species

A species is a stable Pokemon catalogue entry. Species identity is represented by `pokemon_species.id`.

Required public identity fields:

- `national_dex_number`
- `canonical_name`
- `display_name`
- `slug`
- `active`

### Card Print Membership

A card print belongs to a species only when an active `card_print_species` row exists.

Required membership fields:

- `card_print_id`
- `species_id`
- `role`
- `counts_for_completion`
- `source`
- `evidence`
- `active`

### Completion Denominator

For a species, total count is:

```text
distinct active card_print_id values mapped to that species
where counts_for_completion=true
```

### Completion Numerator

For a user and species, owned count is:

```text
distinct denominator card_print_id values with at least one active vault_item_instances row for that user
```

Active ownership means:

```text
vault_item_instances.user_id = current user
vault_item_instances.archived_at is null
```

### Copy Count

Copy count is the number of active `vault_item_instances` rows for the mapped print set. Copy count is secondary and must not replace unique owned progress.

## Required Views Or Helpers

Grookai Dex V1 must expose these app-facing concepts:

### Species Index Row

Fields:

- `species_id`
- `national_dex_number`
- `display_name`
- `slug`
- `types`
- `generation`
- `total_print_count`
- `owned_print_count`
- `owned_copy_count`
- `completion_percent`

### Species Detail Row

Fields:

- `species_id`
- `card_print_id`
- `gv_id`
- `name`
- `set_id`
- `set_code`
- `set_name`
- `number`
- `number_plain`
- `rarity`
- `variant_key`
- image fields resolved through existing card image helpers
- `role`
- `counts_for_completion`
- `owned_count`
- `is_owned`

Implementation may use SQL views, server-side helpers, or an RPC, but the above fields are the stable app contract.

## Mapping Rules

Membership may be created from:

- manual override
- provider subject identity
- PokemonAPI or TCGdex structured data
- `card_print_traits.national_dex` where context confirms a Pokemon subject
- conservative name parsing with exceptions

Membership must be auditable. Every row must include:

- `source`
- `confidence` or equivalent evidence strength
- `evidence`

High-risk mappings require explicit manual exception evidence.

High-risk examples:

- gender-symbol names
- punctuation names
- accent names
- regional forms
- tag-team cards
- trainer-owned Pokemon
- trainer/item/stadium cards with Pokemon art
- multi-subject cards

## Completion Rules

Counts for completion:

- normal Pokemon cards
- trainer-owned Pokemon cards where the Pokemon is the card subject
- tag-team or multi-subject cards where the Pokemon is named as a card subject
- variants that are distinct `card_print_id`s

Does not count for completion by default:

- cameos
- background artwork only
- Trainer cards where the Pokemon is not the card subject
- Item cards
- Stadium cards
- Energy cards
- ambiguous low-confidence matches

## Security And Privacy

Species catalogue and mapping rows may be public read.

User progress is private and must be scoped to the authenticated user unless a later public-sharing contract explicitly permits exposure.

Server-side reads may use the service role only when:

- user identity is already verified
- rows are filtered by the verified user id
- no other users' ownership data is returned

## Performance Expectations

The species index must avoid per-species N+1 ownership queries.

Acceptable V1 patterns:

- batch fetch all mapped `card_print_id`s for visible species
- batch fetch owned counts from `vault_item_instances`
- aggregate in SQL or in a server helper

The species detail page may batch fetch one species worth of mapped prints and one ownership count map.

## Feature Flag

Grookai Dex V1 should ship behind a feature flag until:

- species catalogue is seeded
- mapping audit passes
- sample denominator checks pass
- web build passes
- owner-scoped progress checks pass

Suggested flag:

```text
NEXT_PUBLIC_GROOKAI_DEX_V1_ENABLED
```

Server-only protection may use:

```text
GROOKAI_DEX_V1_ENABLED
```

## Required Audit Commands

Before apply:

```powershell
npm run grookai-dex:species:dry-run
npm run grookai-dex:mapping:dry-run
npm run grookai-dex:audit
```

After apply:

```powershell
npm run grookai-dex:audit
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm --prefix apps/web run build
npm run contracts:test
npm run contracts:runtime-health
```

## Acceptance Criteria

Grookai Dex V1 is acceptable only when:

- `/dex` lists active Pokemon species
- `/dex/[speciesSlug]` lists mapped card prints
- each species shows `owned / total`
- owned count uses unique active `vault_item_instances.card_print_id`
- total count uses mapped active `card_print_species.card_print_id`
- missing cards are visible
- owned cards are visible
- slug handling works for special-name Pokemon
- mapping audit identifies unmapped and low-confidence rows
- feature can be disabled without affecting existing routes

## Non-Goals

Grookai Dex V1 does not:

- change card identity
- change GV-ID generation
- change pricing
- change scanner behavior
- run DB remediation
- modify existing vault ownership semantics
- replace public profile collection routes

## Contract Classification

Current contract state:

```text
DRAFT_READY_FOR_REVIEW
```

Build state:

```text
NOT_IMPLEMENTED
```
