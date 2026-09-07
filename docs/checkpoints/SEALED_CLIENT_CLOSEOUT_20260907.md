# Sealed Client Closeout - 2026-09-07

## Scope And Status

Pokemon sealed remains signed-in only. No catalog, Storage, price pointer,
visibility, or Vault writes were made by this closeout. Background isolation
remains deferred in `docs/plans/SEALED_PRODUCT_IMAGE_ISOLATION_V1_20260907.md`.

Source checkout: `C:/grookai_vault_pokemon_sealed`.
Client implementation tested: `f31a75ee121ce3faceb0462820e45c9c4793b6b5`.
iOS sealed-flag fix: PR 430, commit `8bb01f9c527cb5f0a4caddf171ca4fef6aee06c0`,
merged. Loading change: PR 431, not yet merged at this checkpoint.

## Retained Readback

Operator root:
`C:/grookai_vault_operator_artifacts/pokemon_sealed/20260907_closeout/`.

- `health/`: 1,721 expected/published; zero expired; 16 aging; three expire
  September 8. Three authenticated image byte/signature checks passed.
- `web_baseline/`: four authenticated production queries, 96 correctly named
  rows with self-hosted image links; anonymous requests redirect to login.
- `coverage_plan/`: 2,525 candidates, 2,294 qualifications, 231 holds,
  421 missing prices, 116 stale prices, 1,757 qualified. Proposal only.
- `signing_benchmark.json`: production Supabase `ycdxbpibncqcchqiihfz`,
  timestamp `2026-09-07T11:38:55.518Z`, 96 trusted signer requests, zero
  failures, zero catalog or Storage writes. Hash SHA-256:
  `f8bac22f3e6080e9f1e1caa25a49410846d0fa60db5ed2d2844a9b9ee5948d68`.
- Benchmark command: `node --use-system-ca C:/grookai_vault_operator_artifacts/pokemon_sealed/20260907_closeout/benchmark_signing.mjs`.
  Script SHA-256: `008c98b3e5ebd53d09e395023fe514b4ad23a2392efccd59287e125a7e3cc1da`.
  It used the existing bounded review probe, one 24-row catalog read and
  rolling signer pools in order 4, 8, 8, 4. No image bytes were downloaded.
  Authentication was revoked after probing; credentials are not retained here.

| Workers | Rows | Signing milliseconds | Failures |
| --- | --- | --- | --- |
| 4 | 24 | 3545.0481 | 0 |
| 8 | 24 | 3054.8677 | 0 |
| 8 | 24 | 3092.0726 | 0 |
| 4 | 24 | 3558.7948 | 0 |

This benchmark tests the signing network phase against deployed services, not
Flutter rendering or an overall app latency guarantee. Both comparison arms use
rolling workers; it does not isolate the old barrier-batch scheduling cost.

## Tests

- Ten sealed client Flutter tests pass, including maximum eight workers,
  ordering, rolling scheduling, failure draining and seven-day expiry.
- Scoped Dart analysis passes; no source price timestamps are extended.
- Mac: 647 non-golden tests pass. The initial full Mac run failed 18
  Windows-authored image goldens; no golden files were changed.
- Windows: all 19 renderer tests pass, matching the CI platform split.
- iOS release/bootstrap: 23 Windows checks pass, one Ruby execution test
  skipped locally; the actual Ruby flag fixture passes on the Mac.
- PR checks must pass and review threads resolve before merging PR 431.

## Remaining Gates

1. Merge reviewed client change; archive exact merged main as iOS build 313
   with both MTG and Pokemon sealed flags; upload to TestFlight and verify
   Apple processing. No public App Store submission is authorized here.
2. Preserve 35 missing-image exclusions: 32 have no source image; three
   source images remain unavailable. No guessed package images or substitutes.
3. Preserve stale/missing-price and qualification exclusions. The three
   August 31 quotes must be withheld September 8 unless genuinely refreshed.
   The fresh proposal has three added and two removed qualified products;
   it is not a publication release and requires image/release reconciliation.
4. MTG `slz`: read-only plan contains 363 cards and one set, no collisions.
   Payload `9b0ab65a13b186910bc4dff88ca101500e27fe1cd71c13e688c25c0fd30b4b68`.
   No canonical or image writes. The worker's `already_exact_complete` reason
   is a reporting defect for plan mode; the actual database state is absent.
5. Language baselines are preserved: Korean source regression, German orphan
   rows and Simplified Chinese conflicting set ownership remain quarantined.
   Issue 260 links fresh evidence. Adapter issue 271 records five unavailable
   providers; Vanguard and Weiss Schwarz each still return HTTP 500 on one
   bounded retry. HTTP 403 sources were not retried or bypassed.
6. Sealed Vault ownership and anonymous licensing remain separate unsatisfied
   product gates. Never put sealed IDs into card-print ownership columns.
7. General app performance needs separate route/device measurements; this
   change only improves sealed image-signing scheduling.

Do not report the entire list complete while these gates remain open.
