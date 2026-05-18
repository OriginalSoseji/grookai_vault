# Grookai Dex V1 Plan

Date: 2026-05-18

## Product Goal

Create **Grookai Dex**, a collector progress feature that lets a subscriber browse every Pokemon and see how complete their collection is for each Pokemon.

Core promise:

```text
Pikachu
20 / 200 cards owned
```

## V1 Scope

Grookai Dex V1 includes:

- global Pokemon index
- species detail page
- all known mapped card prints for a species
- owned unique print count
- total mapped print count
- owned/missing filter
- set, era, rarity, and type filters where existing data supports them
- direct links from missing cards into existing card/detail/add-to-vault flows
- authenticated user progress

V1 does not include:

- scanner changes
- DB remediation
- AI artwork/cameo detection
- automatic detection from card art
- social leaderboards
- public Dex sharing
- custom user goals
- evolution-line completion
- grading-specific completion
- pricing logic changes

## Recommended Routes

Primary routes:

- `/dex`
- `/dex/[speciesSlug]`

Optional future routes:

- `/dex/generation/[generation]`
- `/dex/type/[type]`
- `/u/[slug]/dex`

The existing public route `/u/[slug]/pokemon/[pokemon]` should remain separate unless it is later rebuilt on top of the Dex mapping contract.

## Data Model Plan

### `pokemon_species`

Purpose: stable catalogue of Pokemon entries.

Suggested columns:

- `id uuid primary key`
- `national_dex_number integer not null`
- `canonical_name text not null`
- `display_name text not null`
- `slug text not null unique`
- `generation integer`
- `types text[]`
- `is_form boolean not null default false`
- `base_species_id uuid null`
- `active boolean not null default true`
- `source text not null`
- `source_ref jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:

- V1 should map most cards to base Pokemon species.
- Official distinct species stay distinct, for example `Mr. Rime`.
- Forms can be represented without forcing V1 completion to be form-specific.

### `card_print_species`

Purpose: explicit mapping between `card_prints` and Pokemon species.

Suggested columns:

- `id uuid primary key`
- `card_print_id uuid not null references card_prints(id)`
- `species_id uuid not null references pokemon_species(id)`
- `role text not null`
- `counts_for_completion boolean not null default true`
- `source text not null`
- `confidence numeric`
- `evidence jsonb not null default '{}'::jsonb`
- `active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Suggested `role` values:

- `primary`
- `tag_team`
- `multi_subject`
- `trainer_owned`
- `form_subject`
- `cameo`
- `manual_override`

Completion rule:

- only rows with `active=true` and `counts_for_completion=true` contribute to the denominator
- cameo rows may exist later, but should default to `counts_for_completion=false`

### Views

Suggested app-facing views:

- `v_grookai_dex_species_v1`
- `v_grookai_dex_card_prints_v1`

Suggested authenticated progress helper:

- server-side app helper using service role and current user id, or
- an RPC such as `get_grookai_dex_progress_v1(user_id_in uuid)` if RLS and grants are explicitly reviewed

For V1, prefer server-side app helpers first. Keep the SQL contract small and easy to audit.

## Mapping Worker Plan

Create a dry-run-first mapping worker.

Suggested command names:

```powershell
npm run grookai-dex:species:dry-run
npm run grookai-dex:species:apply
npm run grookai-dex:mapping:dry-run
npm run grookai-dex:mapping:apply
npm run grookai-dex:audit
```

Worker inputs:

- existing `card_prints`
- existing `card_print_traits`
- existing `external_mappings`
- existing normalized PokemonAPI/TCGdex payloads where available
- curated species seed file
- curated exception file

Required dry-run output:

- total species staged
- total card prints scanned
- mapped card prints
- unmapped Pokemon card prints
- multi-species candidates
- collision candidates
- low-confidence candidates
- manual exceptions required

Apply must be blocked unless dry-run reports:

- no duplicate active `(card_print_id, species_id, role)` mappings
- no missing species slugs
- no denominator-changing conflicts without explicit exception
- no unreviewed high-risk name collisions

## Mapping Rules

Priority order:

1. explicit manual overrides
2. provider identity fields that identify a Pokemon subject
3. trusted `national_dex` trait where `supertype='Pokemon'`
4. structured API names with exception handling
5. conservative name parser

Do not count these for completion in V1 unless explicitly reviewed:

- Trainer cards where the Pokemon only appears in artwork
- Item cards
- Stadium cards
- Energy cards
- ambiguous cameo cards
- cards with no durable card-print identity

Multi-Pokemon cards:

- map each named Pokemon subject
- use `role='tag_team'` or `role='multi_subject'`
- count for each subject by default only when the card title names the Pokemon subjects

Trainer-owned Pokemon:

- `Misty's Psyduck` counts for Psyduck
- role should be `trainer_owned`

Regional/form cards:

- V1 maps to the base species unless a product decision says form completion should be separate
- retain form evidence in `evidence`

## Ownership Progress Plan

Denominator:

```text
count(distinct card_print_id)
from card_print_species
where species_id = target
  and active = true
  and counts_for_completion = true
```

Numerator:

```text
count(distinct card_print_id)
from card_print_species
join vault_item_instances on vault_item_instances.card_print_id = card_print_species.card_print_id
where species_id = target
  and card_print_species.active = true
  and card_print_species.counts_for_completion = true
  and vault_item_instances.user_id = current user
  and vault_item_instances.archived_at is null
```

Copy count:

```text
count(vault_item_instances.id)
```

Display:

- progress counter uses unique owned card prints
- secondary copy count can show total copies owned
- slabs count if the active instance resolves to the same `card_print_id`

## UI Plan

### `/dex`

Show:

- search box
- generation/type filters
- species grid/list
- owned count and total count per species
- completion percentage
- quick filter: incomplete only

Card style should be compact and scannable. This is a collector tool, not a landing page.

### `/dex/[speciesSlug]`

Show:

- species header
- `owned / total`
- tabs or segmented controls: All, Owned, Missing
- card print grid
- set filter
- rarity filter
- sort by set release, number, name, owned state
- existing card image/display components where possible

Card actions:

- owned card opens existing card/vault detail
- missing card links to existing add/search flow

## Verification Plan

Pre-build audit:

```powershell
npm run grookai-dex:species:dry-run
npm run grookai-dex:mapping:dry-run
npm run grookai-dex:audit
```

Required evidence:

- species seed count
- mapped card print count
- unmapped Pokemon card print count
- manual exception count
- denominator sample for top Pokemon
- ownership progress sample for a known user

Suggested sample Pokemon:

- Pikachu
- Charizard
- Eevee
- Mew
- Nidoran Male
- Nidoran Female
- Mr. Mime
- Ho-Oh
- Type: Null

App checks:

```powershell
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm --prefix apps/web run build
```

Contract checks:

```powershell
npm run contracts:test
npm run contracts:runtime-health
```

## Rollback Plan

If Dex mapping causes bad counts:

1. disable route exposure behind feature flag
2. mark suspect `card_print_species` rows `active=false`
3. preserve evidence in mapping audit output
4. rerun dry-run with corrected exception file
5. reapply only after denominator diff is reviewed

If species catalogue is wrong:

1. do not delete rows in V1
2. mark species inactive if needed
3. add corrected seed row or alias
4. rerun mapping audit

## Build Sequence

1. Approve this contract.
2. Add species seed and exception files.
3. Add dry-run audit script.
4. Add SQL migration for species and mapping tables.
5. Add read views.
6. Add app helper for species index and species detail.
7. Add `/dex` route.
8. Add `/dex/[speciesSlug]` route.
9. Add progress counters from `vault_item_instances`.
10. Add tests and contract checks.
11. Run dry-run, apply, and app verification.

## Open Product Decisions

- Should regional forms count toward base species completion in V1?
- Should tag-team cards count for every named Pokemon?
- Should cameo appearances ever count?
- Should promo variants count separately if they have separate `card_print_id`s?
- Should the Dex be subscriber-only, authenticated-only, or public read with private ownership state?

Recommended V1 answers:

- regional forms count toward base species
- tag-team cards count for every named Pokemon
- cameos do not count
- every distinct `card_print_id` counts separately
- Dex is authenticated and subscriber-value first
