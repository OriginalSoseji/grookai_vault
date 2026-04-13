SET ART SYSTEM V1

Purpose

Establish a clean, scalable set-art sourcing system so sets can expose one approved primary image safely and reproducibly.

Sets Image Audit
- total sets:
  - `248`
- sets with symbol only:
  - `0`
- sets with any art-like field today:
  - `171`
  - current image-like fields are `logo_url` + `symbol_url`
- missing coverage:
  - `77` sets currently have neither `logo_url` nor `symbol_url`
- current hero image system:
  - none
  - live database rejects `hero_image_url` today because the column does not exist

Source Mapping Plan
- primary source:
  - TCGdex set logo asset
- fallback source:
  - Pokemon TCG API set logo asset
- later manual fallback:
  - reserved for curated exceptions only
- non-goals:
  - no scraping
  - no mixed unknown hosts
  - no symbol-as-hero fallback unless the contract is explicitly widened later

Implementation Direction
- schema:
  - add `sets.hero_image_url text`
  - add `sets.hero_image_source text`
  - constrain `hero_image_source` to approved values only
- ingestion:
  - pokemonapi normalize fills hero fields when `images.logo` is present and hero is still empty
  - tcgdex normalize fills hero fields when `logo` / `images.logo` is present and hero is still empty
- backfill:
  - target newest sets first
  - validate URLs before writing
  - do not overwrite existing hero values

Backfill Result
- live schema:
  - `hero_image_url` and `hero_image_source` are now present on `public.sets`
- populated subset:
  - `50` sets backfilled
  - all `50` currently resolved through TCGdex PNG logo assets
- current live coverage:
  - `50 / 248` sets now have `hero_image_url`
- known blocker on fallback tier:
  - Pokemon TCG API set-image fallback is wired in code, but the current environment receives `403 Forbidden` responses from that upstream, so the initial live backfill stayed on the approved TCGdex path only
