# MEE Core Quality Gate Remaining Candidate Actions Apply V1

## Status

- Status: applied
- Package: `MEE-CORE-QUALITY-GATE-REMAINING-CANDIDATE-ACTIONS-V1`
- Package fingerprint: `432f698991dc692ffb6793f615c858ba36bef5f8d8fe60c7548422e6c44c6e03`
- Row manifest hash: `c6c0c590986faa04fb52b13e52dbcd2799e2aa6d4911b39604ca19922e1d9171`
- Apply SQL hash: `8bdbcb1001e19c6cc175b2048a5af853fc6cf4dfc13888cdee6fce2348d1ecd6`

## Scope Applied

Applied exactly `270` internal review actions against pending `raw_single` and `slab` candidate dispositions:

- `60` hard exclusion policy rows -> `block_evidence` / `lot_bulk_sealed_proxy_noise`
- `160` raw/slab lane policy rows -> `block_evidence` / `special_lane_ambiguous`
- `1` manual policy hold row -> `block_evidence` / `manual_hold`
- `49` identity confidence v2 defer rows -> `defer_more_evidence` / `unresolved_match_ambiguity`

## Readback Proof

- `matching_action_event_rows`: `270`
- `distinct_event_disposition_rows`: `270`
- `updated_target_rows`: `270`
- `forbidden_confirm_event_rows`: `0`
- `event_public_flag_rows`: `0`
- `target_public_flag_rows`: `0`
- `remaining_pending_candidate_rows`: `0`
- `pricing_observations_count`: `0`
- `public_pricing_view_market_evidence_references`: `0`

## Boundary

No provider calls, source fetches, pricing observations, `ebay_active_prices_latest` writes, public pricing views, app-visible pricing, public rollups, identity writes, vault writes, image/storage writes, deletes, upserts, merges, migrations, or global apply were performed.
