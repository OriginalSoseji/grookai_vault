# Catalog Page Read Latency

September 13, 2026. Base live/main: `e986e10eee8b8c917ae646f37a11a20536a259c9`.
Branch: `fix/catalog-page-read-latency-20260913`.
Tree: `C:/grookai_vault_catalog_presentation_release_20260913`.
Receipts: `C:/grookai_vault_operator_artifacts/catalog_page_read_latency_20260913`.

## Scope

Overlap independent selected-page metadata and printing reads. Preserve exact
numeric order, caller/visibility scope, all metadata and printing authority.
Metadata stays sequential in chunks of 100; the printing helper retains its
existing limits. At most two page reads in flight. Settle both branches before
failure, require every metadata identity exactly once, and return no partial page.
No global cache, migration, database/Storage write, native change or worker change.

## Evidence Before Release

- 27 targeted contracts passed, including existing pagination/performance tests.
- Typecheck passed.
- Fifteen paired anonymous production comparisons, five sets, 65 total requests.
  Exact metadata/printing payload parity in every comparison, max active reads two.
- Median measured metadata-plus-printing latency: sequential 207 ms, overlapped
  127 ms. This excludes set resolution/order-index/HTTP rendering and is not a
  full-endpoint benchmark or load test. One paired sample regressed due to timing
  variance; preserve all observations, not only improvements.
- Prior numeric release readback: 1,457 identities intact, but median endpoint
  latency grew from 747 ms to 1,120 ms. Do not claim this work fixes every delay.

## Remaining Gate

Full managed source checks; freeze producer; one guarded website candidate with
original deployment preserved. Compare complete page identity/metadata parity,
Load more, images/layout and signed-in Vault/price readback. Measure endpoint
latency before and after. Promote only on passing correctness checks; restore
temporary verification configuration and record final receipts.

Do not repeat completed Japanese image applies or catalog publication. Remaining
coverage and native presentation tasks remain separate from this narrow repair.
