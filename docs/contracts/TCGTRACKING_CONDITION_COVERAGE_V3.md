# TCGTracking exact condition coverage V3

Status: Active implementation contract. Owner requested completion of the
pricing rollout on November 19, 2026. V2's source use, exact amount, currency,
freshness, authentication, cache and client boundaries remain binding. This
version adds two read-only identity-authority paths; it does not widen the
existing market publication policy or change valuations.

## Current exact publication authority

An existing nonprovisional, supported child may use its current exact market
publication as finish authority when the governed exact-printing RPC returns
one available, fresh USD TCGplayer record. Match parent, child, finish and
provenance to exactly one snapshot in the current publication/run. Parent
summaries, `From` values, old generations and another printing's provenance do
not qualify. Revalidate active source-product/category/group and current mapping
ownership. Hidden reviews, competing products/parents/finishes, inactive mappings
and publication changes fail closed. Existing MTG finish mappings remain exact
child mappings and never acquire a parent fallback.

This supplies only an existing product/finish/language identity. The market
amount is never used as a condition value. Read and validate the documented
fresh SKU feed for each requested condition as in V2.

## Source-bound One Piece import authority

The existing One Piece import already records exact durable source-product
identity, official number/name authority and a source-backed printing repair.
Reuse that stored assertion only when all these pins agree:

- active canonical `one_piece_eng_print` identity;
- nonprovisional unique Normal or Foil child from
  `ONE_PIECE_EXACT_PRODUCT_PRINTING_REPAIR_20260919`;
- retained raw-import and 64-hex Master Index provenance reference;
- canonical `tcgplayer_product_<id>` variant and matching explicit external ID;
- exactly one active parent mapping with
  `exact_durable_source_product_with_official_number_name` authority,
  `ONE_PIECE_COMPLETE_ENGLISH_NUMBERED_PARENT_PROMOTION_PLAN_V1`, a durable
  staging UUID, and the exact source group;
- current active category68 product/group and identical printed Number;
- no hidden review, competing parent owner or conflicting child/finish mapping.

A marker, name match or numeric product ID alone never qualifies. Missing or
changed pins stay unavailable. This reader does not create mappings, assign a
new finish, mark a review verified, or change canonical visibility.

## Release and limits

The existing authenticated API/DTO remains compatible with installed clients.
Source amounts remain unchanged, currency remains unverified with `USD assumed`,
and missing conditions remain unavailable. No percentages, interpolation,
condition substitution or source blending is permitted.

This package makes no database, source-import, mapping, review, asking-price,
Vault-total or inventory writes. Market publication expansion is a separate
versioned/schema-qualified package; passing this reader does not activate it.
Require the full managed hooks, hosted checks and deployed authenticated
acceptance. Record local/backend live-source proof separately from deployment.
