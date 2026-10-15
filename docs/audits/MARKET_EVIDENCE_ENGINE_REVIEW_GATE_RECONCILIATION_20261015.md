# Market Evidence Engine Review-Gate Reconciliation — 2026-10-15

## Production gate result

The threshold audit evaluated `27,207` internal rollups without changing production:

| Bucket | Rows |
| --- | ---: |
| Review-ready internal candidate | 14,488 |
| Review-required more evidence | 10,888 |
| Review-required contamination | 1,244 |
| Review-required outlier spread | 587 |

Breakdown:

- raw-single rollups: `18,422`
- slab rollups: `8,785`
- review-ready raw-single: `11,610`
- review-ready slab: `2,878`

No boundary leaks were found. The sampled rollups remain `needs_review = true`, `publishable = false`, `app_visible = false`, and `market_truth = false`.

## Tooling blocker

The existing full review-queue exporter timed out at the linked database statement timeout. Its per-rollup lateral sample query joins the multi-million-row candidate and observation tables for every rollup. That query shape is not suitable for the current warehouse volume.

## Next implementation step

Build a bounded review export before any human review or promotion:

1. select a deterministic top-N rollup slice by review bucket and evidence class;
2. fetch listing samples only for those selected card IDs;
3. require an index-backed candidate lookup on `(match_version, card_print_id)`;
4. emit a queue fingerprint and timeout-safe artifact;
5. keep all dispositions and public gates unchanged.

No pricing observation writes, public views, app-visible prices, or market-truth promotion are authorized by this checkpoint.
