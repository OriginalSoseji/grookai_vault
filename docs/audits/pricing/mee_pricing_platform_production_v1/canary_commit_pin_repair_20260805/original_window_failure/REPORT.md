# TCGPlayer Market 72-Hour Canary Observation

- Audit version: `TCGPLAYER_MARKET_CANARY_OBSERVATION_AUDIT_V3`
- Policy version: `TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V3`
- Status: `failed`
- Window start: `2026-08-02T22:29:17.856Z`
- Required end: `2026-08-05T22:29:17.856Z`
- As of: `2026-08-05T06:09:49.658Z`
- Observed hours: `55.676`
- Expected commit: `6b729441bf8944048885ade5d9905e23166d9d46`
- Allowed source gaps: `5`
- Expected current rows: `100`

## Schedule

- Expected slots through this check: `2`
- Matched slots: `0`
- Pending slots: `0`
- Missing slots: `2`
- Unhealthy slots: `0`
- Unmatched source runs: `0`
- Unmatched publication runs: `0`

## Current Read Model

- Exact prices: `0`
- Positive USD prices: `0`
- Missing provenance: `0`
- Stale visible prices: `0`
- Broken traces: `0`

## Access

- Authenticated runtime rows: `0`
- Anonymous runtime denied: `true`
- Anonymous denial code: `42501`

## Findings

- `expected_schedule_slot_missing`
- `terminal_operations_alert_in_window`
- `current_exact_price_count_mismatch`
- `current_positive_usd_count_mismatch`
- `current_source_health_not_healthy`
- `current_source_evidence_stale`
- `authenticated_pricing_runtime_read_empty`
