# MEE-06C Normalized Reference Evidence V1

Status: Draft implementation

## Purpose

Normalize free/reference raw evidence into deterministic model-input candidates without publishing prices.

This phase exists because public reference feeds contain useful fields and noisy fields side by side. For example, TCGCSV `marketPrice` and `midPrice` can be useful reference signals, while `highPrice` often behaves like an extreme ask bucket and should not influence Grookai value.

## Boundary

- Local artifact only.
- No provider calls.
- No source page fetches.
- No database writes.
- No pricing rollups.
- No migration apply.
- No public price publication.
- No exact market truth claims.

## Inputs

Any `MARKET_EVIDENCE_ENGINE_V1` raw acquisition artifact with `candidate_evidence`, including:

- `MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1`
- `MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1`
- `MEE-04D_PRICECHARTING_CSV_RAW_EVIDENCE_V1`

## Output

The normalizer writes:

- `normalized_evidence`
- `model_disposition`
- `model_eligible`
- `evidence_quality_score`
- `weight_hint`
- `quality_flags`
- proof summary and samples

## Metric Policy

Accepted as possible reference model candidates:

- `market`, `marketPrice`
- `mid`, `midPrice`
- `averageSellPrice`
- `avg7`, `avg30`
- `trendPrice`
- `low`, `lowPrice`, `directLow`, `directLowPrice` when not outlier flagged

Quarantined by default:

- `high`, `highPrice`

Blocked:

- missing/invalid prices
- candidates with blocking exclusion flags
- candidates that try to publish directly
- candidates missing the review gate

## Outlier Policy

Rows are grouped by card print, source, currency, and finish. A reference median is computed without high-price buckets.

Rows are quarantined when:

- price is at least 4x the group median and at least 100
- price is at most 1/8 of the group median when the median is at least 25

This is intentionally conservative. It does not delete evidence; it prevents bad evidence from influencing future model input.

## Command

```bash
npm run mee:normalize-reference
```

To normalize a specific acquisition:

```bash
npm run mee:normalize-reference -- --acquisition=docs/audits/market_evidence_engine_v1/example.json
```

## Next Step

After this artifact proves stable on larger samples, the next phase can scale free reference acquisition overnight and normalize each acquisition before any warehouse write is proposed.
