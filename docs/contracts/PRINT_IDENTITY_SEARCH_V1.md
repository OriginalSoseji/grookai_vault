# PRINT_IDENTITY_SEARCH_V1

Status: Draft
Date: 2026-05-19

## Objective

Make every stable print identity field searchable from the website and mobile app through one shared resolver contract.

## Route Policy

Parent print routes remain canonical:

```text
/card/<parent_gv_id>
```

Child printing search results may carry selected printing context:

```text
/card/<parent_gv_id>?printing=<printing_gv_id>
```

This contract does not enable:

```text
/card/<printing_gv_id>
```

## Searchable Objects

The resolver supports two public-safe object types:

```text
parent_print
child_printing
```

`parent_print` rows represent `card_prints`.

`child_printing` rows represent independently selectable `card_printings` that still route through the parent card page.

## Required Search Fields

The search document must include:

- parent `card_prints.gv_id`
- child `card_printings.printing_gv_id`
- parent name
- set code
- set name
- printed set abbreviation
- collector number
- normalized collector number
- rarity
- `variant_key`
- `printed_identity_modifier`
- display discriminator
- child `finish_key`
- child finish label
- parent `external_ids`

## Result Payload

The app-facing result must include:

```text
object_type
parent_gv_id
printing_gv_id
display_name
display_discriminator
route_path
route_query
matched_fields
rank_score
```

The website may enrich this with existing card tile fields, pricing, and image truth.

## Ranking Rules

Exact public IDs are strongest:

1. exact `printing_gv_id`
2. exact parent `gv_id`
3. exact set + collector number + name/family token
4. exact child finish label with matching parent card tokens
5. variant/modifier/rarity/set/name fuzzy matches

Ambiguous results must go to Explore, not forced direct redirect.

## Safety Rules

- No raw UUIDs are exposed as public identity.
- Child printings never replace parent `gv_id`.
- Species Dex denominators remain parent-print based.
- Search does not write canon data.
- Search does not enable child public card routes.
- Search must fail closed to existing parent-card search if the V1 RPC is unavailable.
