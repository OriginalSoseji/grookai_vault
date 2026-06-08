# PriceCharting Context + PokemonTCG Preservation Checkpoint V1

Date: 2026-05-27

Audit-only checkpoint for the English Master Index source-gap pass.

## Safety

| Field | Value |
| --- | --- |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| final_reports_promoted | true |

## What Changed

- PriceCharting exact product-page evidence remains promotable only as `finish_presence`.
- PriceCharting search-result titles are now preserved as `finish_context_search_title` manual-review context only.
- Prior exact PriceCharting cache evidence is preserved so a later gap-only pass cannot delete earlier validated evidence.
- PokemonTCG preservation overrides were added for four promoted-baseline facts that live source availability could otherwise drop.

## Promoted Guarded Rebuild

Guarded rebuild report:

`docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/last_guarded_rebuild_v1.json`

Final promoted metrics:

| Metric | Value |
| --- | --- |
| master_verified_cards | 21,556 |
| master_verified_printings | 37,857 |
| conflicts | 0 |
| evidence_rows | 231,247 |
| candidate_printings | 116 |
| human_source_verified_printings | 896 |

## Source Evidence Added

PriceCharting report:

`docs/audits/english_master_index_source_exhaustion_v1/pricecharting_acquisition_v1/pricecharting_finish_acquisition_v1.json`

| PriceCharting class | Count |
| --- | --- |
| validated exact rows | 17 |
| manual-review context rows | 376 |
| no validated match | 494 |
| fixture files | 78 |

PokemonTCG preservation snapshot:

`docs/audits/verified_master_set_index_v1/source_snapshots/pokemontcg_api_preservation_overrides_v1.json`

Preserved facts:

- `hgss1 118 Lightning Energy reverse`
- `swshp SWSH296 Champions Festival normal`
- `sm9 152a Pokemon Communication card identity`
- `sm9 152b Pokemon Communication card identity`

## Invariant

PokemonTCG live evidence may add rows, but live availability must not delete or hide cached snapshot evidence from a promoted safe baseline.

Search-result evidence is useful source context, but it is not canonical finish truth unless exact product-page validation or another exact source promotes it.
