# Perfect Order Closure Status V1

Status: CLOSED  
Scope: `me03` / Perfect Order post-promotion closure  
Updated: 2026-04-16

## Context

Perfect Order is the first set promoted through the source-backed external discovery bridge into the governed warehouse pipeline and then into canon with founder approval. This checkpoint records the post-promotion closure state for:

1. canon completeness
2. warehouse closure
3. external mapping closure
4. image closure
5. optional pricing visibility

## Current Truth

- `sets.code = 'me03'`: 1 row
- `sets.printed_total`: 124
- `card_prints where set_code = 'me03'`: 130
- `canon_warehouse_candidates` for `me03-perfect-order-pokemon`: 130 `PROMOTED`
- blank-string `variant_key` rows in `me03`: 0
- product-leak rows in `me03`: 0

## Collision Integrity

The six proven same-name same-number identity-bearing pairs remain split correctly:

- `089` Spewpa -> `illustration_rare`, `shiny_rare`
- `090` Rowlet -> `illustration_rare`, `shiny_rare`
- `092` Aurorus -> `illustration_rare`, `shiny_rare`
- `093` Dedenne -> `illustration_rare`, `shiny_rare`
- `094` Clefairy -> `illustration_rare`, `shiny_rare`
- `095` Espurr -> `illustration_rare`, `shiny_rare`

## Mapping Closure

Mapping closure is complete after a scoped JustTCG repair using:

- `backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs --set-code=me03`

Result:

- active `external_mappings` rows for source `justtcg`: 130
- mapped `card_prints`: 130
- unmapped `me03` card prints: 0
- helper set alignment row created in `justtcg_set_mappings`
  - `justtcg_set_id = me03-perfect-order-pokemon`
  - `alignment_status = exact_aligned`
  - `match_method = canonical_name`

The repair respected the Perfect Order collision pairs by resolving on:

- aligned set
- printed number
- normalized printed name
- rarity disambiguation

No ambiguity or mapping conflicts remained in the scoped dry run or apply run.

## Image Closure

Image closure is complete under `REPRESENTATIVE_IMAGE_CONTRACT_V1`.

Representative Image Implementation V1 was implemented for this set:

- contract: `docs/contracts/SOURCE_IMAGE_ENRICHMENT_V1.md`
- worker: `backend/images/source_image_enrichment_worker_v1.mjs`
- source chosen: `TCGdex`
- scope: `--set-code=me03` only
- default mode: dry-run, scoped apply

Applied result:

- total canon rows: 130
- exact image rows: 0
- representative image rows: 130
- `representative_shared`: 118
- `representative_shared_collision`: 12
- `missing`: 0
- unmatched: 0
- ambiguous: 0
- `image_url` writes: 0

Why TCGdex was chosen:

1. the repo already has governed TCGdex integration surfaces
2. `me03` exists in the live TCGdex set/card APIs
3. TCGdex exposes stable per-card image handles for standard rows

Collision shared-representative result:

1. the six collision groups in Grookai canon produce 12 rows:
   - `089` Spewpa
   - `090` Rowlet
   - `092` Aurorus
   - `093` Dedenne
   - `094` Clefairy
   - `095` Espurr
2. for each of those printed numbers, TCGdex exposes only 1 image-bearing candidate
3. Grookai canon correctly contains 2 identities per number:
   - `illustration_rare`
   - `shiny_rare`
4. both rows now use the same `representative_image_url`
5. both rows now use:
   - `image_status = representative_shared_collision`
   - `image_note` explaining exact variant imagery is still pending

Conclusion:

- representative coverage is complete
- exact image coverage remains intentionally empty for `me03`
- no ad hoc `image_url` editing was performed
- no identity drift occurred

Representative image schema/read-model support now exists:

- `card_prints.representative_image_url` added
- `card_prints.image_note` added
- `card_prints.image_status` normalized toward representative-aware vocabulary
- current `me03` state after representative-image apply:
  - `image_url = null` for all 130
  - `representative_image_url` populated for all 130
  - `image_status = 'representative_shared'` for 118
  - `image_status = 'representative_shared_collision'` for 12
  - `image_note` populated for the 12 collision rows only

Representative UI fallback is now wired on the bounded surfaces patched in this pass:

- public card page
- public set grid
- explore card grid / list / table
- founder warehouse preview
- Flutter card detail
- Flutter public set detail

## Pricing Visibility

Pricing visibility was audited and intentionally left non-blocking.

Current state:

- `justtcg_variants` rows for `me03`: 0
- `justtcg_variant_price_snapshots` rows for `me03`: 0
- `justtcg_variant_prices_latest` rows for `me03`: 0
- `v_best_prices_all_gv_v1` visible priced rows for `me03`: 0

Reason this was not repaired in this pass:

- `backend/pricing/justtcg_domain_ingest_worker_v1.mjs` is safely scopeable by `--set-code=me03`
- `backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs` is global-only
- the closure rules for this pass prohibit widening into global runs

Conclusion:

- pricing visibility remains incomplete
- this is non-blocking for canon closure
- the next lawful pricing step is a scoped domain ingest followed by an explicitly approved global latest refresh, or a future scoped latest builder

## Closure Decision

Perfect Order is fully closed.

Closed:

- canon completeness
- founder-gated promotion
- warehouse closure
- variant-key null semantics
- JustTCG mapping closure
- representative image closure for all 130 canon rows
- honest representative UI fallback

## Exact Bounded Next Step

The next optional quality pass is exact-variant image replacement for the 12 collision rows.

Any follow-up path must:

- preserve collision-row identity
- keep `image_url` reserved for exact images only
- replace representative rows deterministically and audibly
- avoid global repair runs
- avoid manual ad hoc `image_url` edits

## Invariants

1. Canon writes remain founder-controlled.
2. Base identity uses `variant_key = NULL`.
3. Collision rows require deterministic non-null `variant_key`.
4. Same-name same-number identity-bearing rows must never collapse.
5. Mapping repair must remain scoped and deterministic.
6. Global latest refreshes are not implicit follow-ons to one-set closure work.
7. Image repair must use a governed source-backed path, not ad hoc field edits.
8. Representative images, once implemented, must never be rendered as if they were exact images.
