# MEE_09B_INTERNAL_REFERENCE_SIGNAL_READ_MODEL_V1

## Status

Implemented as a read-only audit/read model.

No database writes, provider calls, source fetches, pricing observations, price rollups, public pricing views, app-visible pricing, identity writes, vault writes, or image writes were executed.

## Purpose

Build the first internal signal layer on top of the `market_reference_*` warehouse.

This layer turns stored normalized reference evidence into per-card signal candidates for engineering review. These are not prices shown to users and are not Market Truth.

## Inputs

- `public.market_reference_candidates`
- `public.market_reference_normalized_evidence`

Only rows with:

```text
model_eligible = true
model_disposition = reference_model_candidate
normalized_currency = USD
```

feed V1 signal math.

Rows in other currencies remain stored evidence but are excluded from V1 USD signal aggregation and counted as `currency_excluded_evidence_count`.

## Output

Local audit artifacts only:

- `docs/audits/market_evidence_engine_v1/mee_09b_market_reference_signal_read_model_*.json`
- `docs/audits/market_evidence_engine_v1/mee_09b_market_reference_signal_read_model_*.md`

No database table or view is created in V1.

## Signal Fields

Each internal signal candidate includes:

- `card_print_id`
- `gv_id`
- source list and source counts
- eligible evidence count
- quarantined evidence count
- excluded non-USD evidence count
- USD low / median / high
- signal band
- `publishable = false`

## Current Proof

Latest live readback:

```text
signal_count: 993
publishable_count: 0
multi_source_signal_count: 197
single_source_signal_count: 796
currency_filter: USD
currency_excluded_evidence_count: 2163
```

Signal bands:

```text
multi_source_reference_candidate: 197
single_source_reference_candidate: 796
```

All emitted signal candidates are USD-only.

## Boundary

This phase must not:

- write `pricing_observations`
- write `ebay_active_prices_latest`
- create public pricing views
- create app-visible pricing RPCs
- affect vault totals
- promote reference evidence to Market Truth
- blend currencies in one signal

## Commands

```bash
npm run mee:reference-signal
node --test tests/contracts/market_evidence_engine_reference_signal_read_model_v1.test.mjs
```

## Next Step

Design `MEE_09C_REFERENCE_SIGNAL_REVIEW_GATE_V1`.

That gate should inspect the 993 internal signal candidates for source quorum, metric quality, variance, outlier behavior, and special-lane safety before any stored rollup or UI-facing reference display is proposed.
