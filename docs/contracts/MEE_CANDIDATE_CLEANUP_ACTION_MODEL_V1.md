# MEE Candidate Cleanup Action Model V1

Status: plan only

## Objective

Define the internal action model for recording cleanup decisions against `market_listing_card_candidates` without mutating raw listing evidence or publishing prices.

## Why This Exists

The publication gate found near-ready evidence, but the candidate layer still has unresolved blockers. Without a durable cleanup action model, nightly jobs would keep rediscovering the same blocked candidates. This model records cleanup decisions as append-only internal events.

## Proposed Objects

### `public.market_listing_candidate_cleanup_events`

Append-only internal event table. Each row records one cleanup decision for one `market_listing_card_candidates` row.

Allowed cleanup actions:

- `keep_review`
- `quarantine_candidate`
- `require_matcher_reclassify`
- `require_special_lane_policy`
- `require_high_value_review`
- `defer_until_more_evidence`

Allowed cleanup states:

- `review_open`
- `quarantined`
- `needs_matcher_reclassify`
- `needs_special_lane_policy`
- `needs_high_value_review`
- `deferred_more_evidence`

### `public.v_market_listing_candidate_cleanup_current_v1`

Internal current-state view. It selects the newest cleanup event per candidate.

### `public.v_market_listing_candidate_cleanup_card_summary_v1`

Internal card-level summary view. It aggregates current cleanup state by `card_print_id`, `gv_id`, and `evidence_lane`.

## Public Boundary

Every cleanup event must keep:

- `can_publish_price_directly = false`
- `publishable = false`
- `app_visible = false`
- `market_truth = false`
- `can_publish_price_directly_at_action = false`

This action model cannot create app-visible prices.

## Access Model

- `service_role`: select and insert cleanup events
- `service_role`: select read-model views
- `public`, `anon`, `authenticated`: no access
- no update grant
- no delete grant

## What This Does Not Do

This model does not:

- mutate `market_listing_card_candidates`
- mutate `market_listing_observations`
- invoke `apply_market_evidence_review_action_v1`
- write `pricing_observations`
- write `ebay_active_prices_latest`
- create public pricing views
- write identity, vault, card-print, image, or storage tables

## Future Workflow

After this schema is explicitly applied, a separate package can seed cleanup events for the audited candidates. That future package should still be non-public and should write only cleanup events.

