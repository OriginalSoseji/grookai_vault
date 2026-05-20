# CAMEO_SEARCH_V1

Status: Draft audit contract  
Created: 2026-05-20

## Objective

Add a governed cameo search layer so users can find cards by Pokemon or trainer appearances that are not the card's primary printed identity.

Examples:

- `Bulbasaur cameo`
- `Charmander background`
- `Pikachu silhouette`
- `Espurr cameo`
- trainer cameo names from the Trainers tab

This contract is audit-first. It does not authorize database writes, migrations, resolver changes, app changes, or public route changes.

## Source Authority

Initial source:

```text
RotomAmiti's Cameo Pokemon Card Database
https://docs.google.com/spreadsheets/d/18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY/htmlview
```

Workbook tabs in scope:

- `Gen 1`
- `Gen 2`
- `Gen 3`
- `Gen 4`
- `Gen 5`
- `Gen 6`
- `Gen 7`
- `Gen 8`
- `Gen 9`
- `Trainers`

The `Main` tab is policy/source documentation only. It must not be imported as cameo rows.

## Non-Goals

Cameo metadata must not change:

- `card_prints.gv_id`
- parent print identity
- child printing identity
- Species Dex denominators
- master-set denominators
- pricing identity
- scanner identity
- public card route policy

Cameo metadata is searchable descriptive metadata, not canonical print identity.

## Required Data Boundary

Cameos must live in a separate relationship layer, not in identity columns.

Recommended future table shape:

```text
card_print_cameos
- id
- card_print_id
- cameo_subject_type
- cameo_subject_name
- pokemon_ndex
- pokemon_species_id
- trainer_key
- source_name
- source_url
- source_tab
- source_row_index
- source_row_hash
- card_name_raw
- set_name_raw
- number_raw
- notes_raw
- cameo_qualifiers
- match_status
- match_confidence
- active
- created_at
- updated_at
```

No write is approved by this contract until a dry-run proves row-level matches.

## Subject Types

Allowed subject types:

```text
pokemon
trainer
```

Pokemon rows come from generation tabs and should preserve `Ndex` when available.

Trainer rows come from the `Trainers` tab. Trainer names must not be forced into `pokemon_species`.

## Source Row Semantics

The source workbook uses merged cells. Empty `Ndex` / `Cameo Pokemon` cells inherit the previous non-empty subject within the same tab.

Importer behavior must:

- carry forward the active subject per tab
- preserve raw row values
- preserve source tab and row index
- preserve source notes
- classify edge-case notes without discarding them

## Cameo Qualifiers

The audit importer must classify notes into deterministic qualifiers where possible:

```text
jumbo
partial_visibility
silhouette
picture
disguise
toy_or_costume
non_english
edge_case
unknown_note
```

Qualifiers are supporting context. They do not change card identity.

## Matching Rules

Future matching to `card_prints` must be dry-run first.

Approved match requires:

- set alias resolves to exactly one canonical set or governed set group
- card name matches the canonical card print name or approved alias
- number matches when source number exists
- row is not ambiguous across parent variants
- no hidden child-printing route or finish inference is required

Rows with missing numbers, ambiguous set aliases, promo/jumbo ambiguity, or same-name same-set collisions must be blocked for manual review.

## Dry-Run Classifications

Required future match classifications:

```text
APPROVED_MATCH
BLOCKED_SET_ALIAS_MISSING
BLOCKED_CARD_NOT_FOUND
BLOCKED_NUMBER_MISSING
BLOCKED_AMBIGUOUS_CARD
BLOCKED_PARENT_VARIANT_AMBIGUITY
BLOCKED_NON_ENGLISH_SCOPE
NEEDS_MANUAL_REVIEW
```

## Search Behavior

When approved cameo mappings exist, search may index cameo tokens in the print identity search document.

Required result behavior:

- return the parent `card_prints.gv_id`
- show why the card matched, e.g. `Cameo: Bulbasaur`
- include note context when useful, e.g. `silhouette`
- never expose raw internal UUIDs
- never route to `/card/<cameo>`
- never route to `/card/<printing_gv_id>` as part of this lane

## UI Display Rules

Card and search surfaces may show compact metadata:

```text
Cameo: Bulbasaur
Cameo: Bulbasaur · silhouette
Cameo trainer: Misty
```

This must be visually secondary to card identity, set, number, and selected finish/variant.

## Safety Rules

Do not:

- write DB rows from source-only audit
- use fuzzy matching to write canon
- pack cameo data into `variant_key`
- pack cameo data into `printed_identity_modifier`
- alter Species Dex completion logic
- alter pricing
- alter scanner
- alter public route gates

Do:

- preserve source provenance
- use exact/deterministic matching first
- block ambiguous rows
- make all importer output auditable

## Current Phase

Current approved build scope:

```text
docs/contracts/CAMEO_SEARCH_V1.md
scripts/audits/cameo_search_v1_audit.mjs
docs/audits/cameo_search_v1/
```

No schema, application, search resolver, or database write work is approved in this phase.

## Promotion Design Rule

Future promotion may only use Phase 3 rows classified as:

```text
APPROVED_MATCH
```

All other rows remain blocked until a later governed lane resolves them.

Blocked classes include:

- `BLOCKED_SET_ALIAS_MISSING`
- `BLOCKED_CARD_NOT_FOUND`
- `BLOCKED_AMBIGUOUS_CARD`
- `NEEDS_MANUAL_REVIEW`
- source rows blocked in Phase 1 before card matching

Japanese promo families and language-scope rows are explicitly blocked from promotion until a separate language-scope review exists. Do not map Japanese promo families to English promo sets by assumption.

Promotion must remain additive:

- insert cameo relationship rows only
- never modify `card_prints`
- never modify `card_printings`
- never modify `pokemon_species`
- never modify Species Dex completion logic
- never modify pricing, scanner, or public route behavior
