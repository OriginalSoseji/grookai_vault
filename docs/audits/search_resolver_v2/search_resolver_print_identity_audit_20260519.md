# Search Resolver Print Identity Audit V2

Date: 2026-05-19

## Scope

This audit reviews the current website and mobile search resolver against the current Grookai print identity model. It is read-only and does not propose immediate code or database writes.

The target product requirement is broader than the current resolver contract:

> Anything that is part of print identity should be searchable from the website and app.

That includes parent print identity, child printing identity, finish labels, variant/modifier labels, set identity, collector numbers, external IDs, and future curated aliases.

## Current Resolver Surfaces

### Website direct search

Files:

- `apps/web/src/app/search/route.ts`
- `apps/web/src/lib/publicSearchResolver.ts`
- `apps/web/src/lib/resolver/resolveQuery.ts`

The direct resolver can redirect to a card only when it finds a conservative direct match. It currently searches parent `card_prints` records only.

Key limitations:

- Direct GV lookup targets `card_prints.gv_id`, not `card_printings.printing_gv_id`.
- Structured collector lookup selects only `id, gv_id, name, number, set_code, printed_set_abbrev`.
- Exact name lookup only checks parent `card_prints.name`.
- Alias/nickname support is stubbed: `resolveAliasOrNickname()` currently returns `null`.
- Child printing public identity must not become a public child route yet, but it still needs to resolve to parent route context such as `/card/<parent_gv_id>?printing=<printing_gv_id>`.

### Website ranked search / Explore

Files:

- `apps/web/src/app/api/resolver/search/route.ts`
- `apps/web/src/lib/explore/getExploreRows.ts`
- `apps/web/src/lib/cards/identitySearch.ts`
- `apps/web/src/lib/resolver/normalizeQuery.ts`

The ranked resolver calls the legacy RPC to get parent candidate IDs, then fetches parent card rows and applies TypeScript ranking.

Key limitations:

- Candidate generation starts with `search_card_prints_v1`, so child printings are invisible at the first stage.
- `CardPrintLookupRow` is parent-oriented and has no `card_printings`, `finish_key`, `finish_label`, or `printing_gv_id`.
- Variant cue handling includes only `alt`, `alternate`, `art`, `rainbow`, `promo`, `holo`, `reverse`, `full`.
- Identity filters are limited to alternate art, classic collection, Pokemon Together Stamp, Trainer Gallery, Radiant Collection, Prerelease, and Staff.
- Master Ball, Poke Ball, Play Pokemon Stamp, child Reverse Holo, child Holo, and finish-specific public IDs are not first-class search facets.

### Mobile search

Files:

- `lib/models/card_print.dart`

Mobile uses `/api/resolver/search` for resolved searches, then falls back to the legacy RPC/direct Supabase parent-card queries in older paths.

Key limitations:

- `_cardPrintSelect` includes parent identity fields but not child printings.
- Mobile cannot represent a child printing result as a distinct selectable object from search.
- The fallback path can disagree with the website resolver because it calls `search_card_prints_v1` and direct parent queries.

### Database RPC and view

Files:

- `supabase/migrations/20251213153627_baseline_views.sql`
- `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql`

`public.v_card_search` and `public.search_card_prints_v1` are legacy parent-print surfaces.

The RPC only applies:

- parent set code equality
- parent number matching
- parent name `ilike`

It does not search:

- `card_prints.gv_id`
- `card_prints.print_identity_key`
- `card_prints.variant_key`
- `card_prints.printed_identity_modifier`
- `card_prints.printed_set_abbrev`
- `card_prints.external_ids`
- `card_print_identity.identity_payload`
- `card_printings.finish_key`
- `finish_keys.label`
- `card_printings.printing_gv_id`

## Live Data Coverage

Read-only live counts from the linked project:

| Surface | Count |
| --- | ---: |
| `card_prints` total | 25,398 |
| parent `gv_id` populated | 21,839 |
| parent `print_identity_key` populated | 2,726 |
| parent `variant_key` populated | 25,280 |
| parent `printed_identity_modifier` populated | 194 |
| parent `printed_set_abbrev` populated | 968 |
| parent `external_ids` populated | 16,959 |
| `card_printings` total | 55,661 |
| child `printing_gv_id` populated | 44,777 |
| child `finish_key` populated | 55,661 |

Child finish distribution:

| Finish key | Count |
| --- | ---: |
| normal | 19,919 |
| reverse | 18,629 |
| holo | 16,816 |
| pokeball | 230 |
| masterball | 67 |

This means the current resolver ignores tens of thousands of real finish-specific identity objects.

## Reproduction Samples

The legacy RPC returns zero rows for queries that should be valid under the current product expectation:

| Query | Expected intent | Current `search_card_prints_v1` result |
| --- | --- | ---: |
| `GV-PK-ME03-033-RH` | child printing public identity | 0 |
| `espurr reverse holo` | card name + child finish | 0 |
| `master ball pikachu` | card name + child finish | 0 |

These are not edge cases. They are direct expressions of print identity.

## Root Causes

1. Search has no single canonical search document.

   Parent print identity, child printing identity, set identity, external mappings, and UI display labels are spread across multiple tables and TypeScript helper layers.

2. Candidate generation is parent-only.

   The ranked resolver can only rank rows it receives. Because the first-stage RPC cannot see child printings, finish-specific queries often never get a lawful candidate.

3. Search vocabulary is manually fragmented.

   Finish labels, variant labels, rarity shorthands, trait shorthands, set aliases, and nickname aliases are not governed in one place.

4. Website and app do not share a strict result contract.

   The API exists, but mobile still carries fallback logic that can produce different behavior from the website.

5. Direct routing and ranked search are solving different problems with different data.

   `/search` direct redirect should be conservative. `/explore` and `/api/resolver/search` should be rich. Today both depend on incomplete parent-first lookup surfaces.

## Required Searchable Identity Fields

At minimum, the next resolver must index these fields:

- Parent public ID: `card_prints.gv_id`
- Child public ID: `card_printings.printing_gv_id`
- Parent identity key: `card_prints.print_identity_key`
- Parent name: `card_prints.name`
- Set code, set name, printed set abbreviation
- Collector number variants: raw number, plain number, padded number, fraction number
- Rarity
- `variant_key`
- `printed_identity_modifier`
- display discriminator label
- child `finish_key`
- child finish label from `finish_keys`
- external identifiers from `card_prints.external_ids`
- external mappings where safe and public
- species link terms where already canonical
- illustrator/year filters where already supported

## Current Production Risk

Classification: `NOT_SEARCH_READY_FOR_PRINT_IDENTITY`

The app has moved beyond parent-card search. It now supports child ownership, finish-specific display, child `printing_gv_id`, and master-set variants. Search has not caught up.

The biggest user-facing failure is that valid collector language like `Espurr reverse holo`, `Pikachu master ball`, or a finish-specific Grookai ID can fail or route to a parent-only result with missing context.

