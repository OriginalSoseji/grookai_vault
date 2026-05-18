# Grookai Dex V1 Audit

Date: 2026-05-18

## Objective

Audit the current Grookai Vault codebase for a new subscription-value feature named **Grookai Dex**:

- list every Pokemon species
- link each Pokemon to all known card prints for that Pokemon
- show collector progress, for example `20/200`
- track owned versus missing cards for each Pokemon

This is audit-only. No implementation, migration, DB write, scanner work, or product redesign was performed.

## Current State

The repo has a partial Pokemon browsing surface, but it is not a Dex.

Current route:

- `apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx`

Current behavior:

- route is collector/public-profile scoped
- it reads shared cards through `getSharedCardsBySlug(profile.slug)`
- it filters cards with `filterSharedCardsByPokemonSlug(sharedCards, params.pokemon)`
- it renders matching shared cards in `PublicCollectionGrid`

Current helper:

- `apps/web/src/lib/getSharedCardsBySlug.ts`

Relevant functions:

- `normalizePokemonSlug`
- `formatPokemonSlugLabel`
- `filterSharedCardsByPokemonSlug`

Current search form:

- `apps/web/src/components/public/PublicPokemonJumpForm.tsx`

The current implementation is useful as a public profile shortcut, but it cannot support Grookai Dex completion tracking.

## Existing Data Surfaces

### Card Catalog

Primary print table:

- `card_prints`

Relevant fields already present in baseline schema include:

- `id`
- `game_id`
- `set_id`
- `name`
- `number`
- `number_plain`
- `set_code`
- `rarity`
- `variant_key`
- `external_ids`
- `print_identity_key`
- image fields

Existing search contract:

- `search_card_prints_v1`
- `v_card_search`

These are useful for finding cards, but they are not a Pokemon species catalogue.

### Traits

Existing trait surface:

- `card_print_traits`

Existing enrichment docs:

- `docs/enrichment/POKEMON_ENRICHMENT_V1_HP_DEX.md`
- `docs/enrichment/POKEMON_ENRICHMENT_V2_TYPES_RARITY.md`

Known trait fields:

- `hp`
- `national_dex`
- `types`
- `rarity`
- `supertype`
- `card_category`
- `legacy_rarity`

This is useful source evidence, especially where `national_dex` and `supertype='Pokemon'` exist. It is not enough by itself for a durable Dex because Grookai Dex needs explicit species-to-print membership, multi-Pokemon handling, exceptions, and completion rules.

### Ownership

Canonical ownership truth:

- `vault_item_instances`

Confirmed repo references:

- `docs/contracts/APP_FACING_DB_CONTRACT_V1.md`
- `docs/contracts/STABILIZATION_CONTRACT_V1.md`
- `apps/web/src/lib/vault/getOwnedCountsByCardPrintIds.ts`
- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`

The existing helper `getOwnedCountsByCardPrintIds(userId, cardPrintIds)` already counts active instance rows where:

- `user_id = current user`
- `archived_at is null`
- `card_print_id in requested ids`

This is the right ownership base for Grookai Dex.

## Gaps

### No Global Species Catalogue

There is no durable app-facing table or view for all Pokemon species. A Dex index should not be inferred from card names at request time.

### No Explicit Species-to-Card Mapping

There is no contract for:

- Pikachu maps to these card_print IDs
- Charizard maps to these card_print IDs
- multi-subject cards count for more than one Pokemon
- cameo or trainer-art cards do not count toward completion

### Current Matching Is Too Weak

`filterSharedCardsByPokemonSlug` normalizes card names and checks whether the card name contains the requested Pokemon string.

Risks:

- false positives from substring matches
- false negatives from punctuation, accents, gender symbols, and official special names
- no handling for multi-subject cards
- no handling for form names
- only sees public shared cards
- cannot calculate a global denominator like `200`

Examples that need explicit handling:

- `Farfetch'd`
- `Sirfetch'd`
- `Flabebe`
- `Nidoran Male`
- `Nidoran Female`
- `Mr. Mime`
- `Mime Jr.`
- `Ho-Oh`
- `Porygon-Z`
- `Type: Null`
- regional forms such as Alolan, Galarian, Hisuian, Paldean
- tag-team and multi-subject cards
- trainer-owned Pokemon such as `Misty's Psyduck`

### No Completion Denominator

The product requirement needs `owned_unique_prints / total_mapped_prints`.

Current public route can only count matching shared cards. It cannot know all known cards for a Pokemon.

### Public Route Should Not Become The Dex Contract

The existing `/u/[slug]/pokemon/[pokemon]` route is profile scoped and public. Grookai Dex should be an authenticated app feature first, with optional public sharing later.

## Recommended Direction

Grookai Dex V1 should introduce an explicit read model:

- species catalogue
- species-to-card-print mapping
- user progress derived from active `vault_item_instances`

It should not rely on the current public substring route for canonical behavior.

## V1 Readiness Assessment

Current state: **NOT_READY_FOR_BUILD_WITHOUT_CONTRACT**

Reason:

- ownership source is ready
- card catalog source is ready
- trait evidence exists
- mapping contract is missing
- species catalogue is missing
- completion denominator is missing
- app routes/components are not yet designed around a canonical Dex read model

## Hard Boundaries

Grookai Dex V1 must not:

- modify scanner architecture
- loosen GV-ID or print identity gates
- rely on `vault_items.qty` as ownership truth
- treat public shared cards as canonical ownership
- infer species membership only from live card-name substring matching
- perform DB remediation under the Dex lane

## Audit Conclusion

Grookai Dex is a strong subscription-value feature and fits the app direction. The correct first build is not UI-first. The first build should establish a small, audited species mapping contract and a user-progress read model. Once that is in place, the web UI can safely expose the Dex index, species detail pages, owned/missing states, and `20/200` counters.
