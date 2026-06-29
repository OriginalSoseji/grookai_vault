# MEE-PUBLICATION-GATE-DESIGN-V1

Mode: plan-only

## Audit Summary

Current readback shows the Market Evidence Engine foundation is safe for internal evidence handling:

- lifecycle observations: `194663`
- lifecycle events: `1362641`
- observations missing `card_print_id`: `0`
- observations missing `gv_id`: `0`
- lifecycle public-boundary leaks: `0`
- review disposition public-boundary leaks: `0`
- current publication handoff candidates: `0`

Current source mix:

- `active_listing / ebay_active`: `183638`
- `reference / tcgcsv_reference`: `7407`
- `reference / pokemontcg_io_reference`: `3618`

Current rollup-eligible lifecycle events:

- active listing raw singles: `5233`
- active listing slabs: `2270`
- reference metrics: `8830`

The gate must therefore be designed as an internal candidate evaluator, not as a public-pricing publisher.

## Gap Analysis

Existing foundation provides:

- lifecycle state and transition history,
- review disposition state,
- dashboard queues,
- assignment queue,
- quality scoring view,
- internal rollup eligibility evidence.

Missing before publication:

- an internal publication gate candidate view,
- explicit publication decision states,
- stale-evidence checks,
- rule-versioned gate readbacks,
- future append-only gate decision table,
- public-pricing handoff contract.

## Proposed Internal Views

Plan candidate:

`public.v_market_evidence_publication_gate_candidates_v1`

Purpose:

- one row per reviewed card/lane candidate,
- computes an internal `gate_decision`,
- computes `would_be_publication_candidate`,
- remains service-role-only,
- keeps `publishable=false`, `app_visible=false`, and `market_truth=false`.

## Proposed Future Table

Future candidate, not created by this package:

`public.market_evidence_publication_gate_decisions`

Purpose:

- versioned, auditable decision records,
- references `card_print_id`, `gv_id`, evidence lane, gate rule version,
- stores input hashes and replay query version,
- remains internal-only until a separate public-pricing contract exists.

## Verification Plan

Before any future remote apply:

- confirm no provider calls,
- confirm no public pricing writes,
- confirm view grants only `service_role`,
- confirm all output public flags are false,
- confirm raw singles and slabs are separated,
- confirm reference-only rows do not become candidates,
- confirm low-signal monitor rows do not become candidates,
- confirm mixed raw/slab rows are blocked,
- confirm classification-blocked rows are blocked,
- confirm no handoff candidate can exist without resolved `review_confirmed_internal_candidate`.

## Next Step After This Plan

Prepare a targeted schema candidate for `v_market_evidence_publication_gate_candidates_v1`, then run it as a dry-run or targeted internal-only apply after explicit approval.

Do not connect this view to app pricing.

