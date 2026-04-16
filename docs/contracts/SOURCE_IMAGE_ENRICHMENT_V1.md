# SOURCE_IMAGE_ENRICHMENT_V1

Status: ACTIVE  
Scope: source-backed canon image enrichment for one set at a time

## Chosen Source

V1 uses TCGdex card images.

## Why TCGdex

1. The repo already has a governed TCGdex integration surface:
   - `backend/clients/tcgdex.mjs`
   - `backend/pokemon/tcgdex_normalize_worker.mjs`
2. Live `me03` set/card endpoints expose stable per-card image handles.
3. TCGdex supports deterministic retrieval by:
   - set id
   - card id
   - local printed number
4. This keeps image enrichment inside an already accepted source lane instead of inventing a new scrape/manual contract.

## Rejected Alternatives For V1

- JustTCG image lane:
  rejected because the live card payloads inspected for Perfect Order do not expose usable card image URLs.

- PokemonAPI image lane:
  audited but rejected for V1 closure because it exposes only the 124-card printed-total surface and not the full 130-row canon collision shape.

- Manual/curated fallback:
  rejected for V1 because it would require a new approval/governance layer and would not be replayable from existing repo contracts.

## Matching Contract

Deterministic lookup key:

- `set_code`
- `number_plain`
- `variant_key`

Matching order:

1. exact set + printed number
2. if the number group is unique in canon and unique in source:
   - require normalized name match
3. if the number group is a collision group:
   - require full group resolution
   - require deterministic rarity/variant alignment
   - if the source exposes fewer distinct candidates than canon, block the whole group

## Collision Safety Rule

If a duplicate-number canon group cannot be fully distinguished by the image source, do not partially assign images within that group.

For Perfect Order this means:

- the six `illustration_rare` / `shiny_rare` pairs remain unassigned under TCGdex V1
- no same-image reuse is allowed across the pair
- no guessed assignment is allowed for the missing side

## Write Contract

The enrichment worker may only fill missing image fields on existing canon rows.

Allowed update:

- `card_prints.image_url`
- `card_prints.image_source`

Rules:

1. one-set scope only
2. dry-run by default
3. no overwrite of existing images
4. idempotent replays
5. no identity mutation

## Stop Rules

Stop immediately if:

1. the source cannot distinguish a collision group safely
2. the only available repair path is global
3. the source does not expose a stable per-card image reference
4. matching depends on guessed rarity or guessed variant identity
