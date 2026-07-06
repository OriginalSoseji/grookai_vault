# MEE-PRICE-CANDIDATE-MODEL-V1

Mode: plan/readback only

## Purpose

Create the first internal Market Evidence Engine price-candidate model.

This is not public pricing. This is not a price publication pipeline. This is not a claim that any provider row is market truth.

The model turns existing internal evidence rollups into reviewable candidate lanes:

- `raw_single`
- `slab`
- `reference`

The model deliberately keeps active listing evidence separate from free reference API evidence.

## Inputs

- `public.market_listing_rollups`
- `public.market_reference_signal_rollups`

Only internal, non-public rollups are eligible:

- `needs_review = true`
- `publishable = false`
- `app_visible = false`
- `market_truth = false`

Active listing candidates require strict title filtering:

- `rollup_payload->>'strict_title_filtered' = 'true'`
- `rollup_payload->>'evidence_class' in ('raw_single', 'slab')`

## Candidate Rules

### Raw Single

High-confidence internal candidate when:

- at least 5 listings
- at least 3 sellers
- median active ask is present
- rollup review bucket is `strict_filtered_review_ready_internal_candidate`

Otherwise the row remains `needs_more_evidence` or `needs_review`.

### Slab

High-confidence internal candidate when:

- at least 3 listings
- at least 2 sellers
- median active ask is present
- rollup review bucket is `strict_filtered_review_ready_internal_candidate`

Slab candidates stay separate from raw singles.

### Reference

Reference rows are context, not market truth.

Reference rows may reach `medium_confidence` only when:

- at least 2 sources
- at least 2 eligible evidence rows
- bounded or moderate variance
- reference median is present

Reference rows remain `reference_context`, `reference_only_hold`, `needs_review`, or blocked by policy.

## Live Readback

Latest readback artifact:

`docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-MODEL-V1/report.json`

Summary from the first live readback:

| Lane | Status | Rows |
| --- | ---: | ---: |
| raw_single high-confidence internal candidate | internal_candidate | 988 |
| raw_single medium-confidence | needs_more_evidence | 210 |
| slab high-confidence internal candidate | internal_candidate | 820 |
| slab medium-confidence | needs_more_evidence | 243 |
| reference low-confidence | blocked_policy | 402 |
| reference low-confidence | needs_review | 350 |
| reference low-confidence | reference_context | 587 |
| reference low-confidence | reference_only_hold | 13,233 |

Total internal candidate rows: `16,833`

Priced candidate rows: `16,833`

Public boundary rows: `0`

## Proposed Internal View

`docs/sql/mee_price_candidate_model_v1_view_candidate.sql`

Proposed view:

`public.v_market_evidence_price_candidates_v1`

The view hardcodes:

- `internal_only = true`
- `can_publish_price_directly = false`
- `publishable = false`
- `app_visible = false`
- `market_truth = false`

## Remote Internal View Apply

Installed internal view audit:

`docs/audits/market_evidence_engine_v1/MEE-PRICE-CANDIDATE-MODEL-V1-REMOTE-SCHEMA-APPLY/report.json`

Remote object:

`public.v_market_evidence_price_candidates_v1`

Grant proof:

- `service_role`: `SELECT`
- `postgres`: owner privileges
- `public`: no grant
- `anon`: no grant
- `authenticated`: no grant

Installed-view readback:

- total candidate rows: `16,833`
- priced candidate rows: `16,833`
- raw single high-confidence internal candidates: `988`
- slab high-confidence internal candidates: `820`
- public boundary rows: `0`

## Readback SQL

`docs/sql/mee_price_candidate_model_v1_readback.sql`

The readback SQL executes the same candidate model without creating the view.

## Boundaries

This package does not:

- write `pricing_observations`
- write `ebay_active_prices_latest`
- create public pricing views
- create app-visible pricing
- create public price rollups
- invoke providers
- fetch sources
- touch identity tables
- touch card tables
- touch vault tables
- touch image/storage tables
- delete, upsert, merge, or migrate

## Decision

The first pricing layer should proceed as an internal read model only.

Next safe step is targeted schema apply for `public.v_market_evidence_price_candidates_v1`, still service-role-only and non-public, then a review dashboard over high-confidence internal candidates.
