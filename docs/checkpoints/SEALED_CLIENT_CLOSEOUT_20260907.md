# Sealed Client Closeout - 2026-09-07

## Scope And Status

Pokemon sealed remains signed-in only. No catalog, Storage, price pointer,
visibility, or Vault writes were made by this closeout. Background isolation
remains deferred in `docs/plans/SEALED_PRODUCT_IMAGE_ISOLATION_V1_20260907.md`.

Source checkout: `C:/grookai_vault_pokemon_sealed`.
Client implementation tested: `f31a75ee121ce3faceb0462820e45c9c4793b6b5`.
iOS sealed-flag fix: PR 430, commit `8bb01f9c527cb5f0a4caddf171ca4fef6aee06c0`,
merged. Loading change: PR 431 merged after checks and review resolutions.
Merged release authority: `7f5412b5b4124bd16544cdf62adf3e3c15f06dbd`.

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
- All required PR checks passed; both review threads were addressed before merge.
- Final sealed Node suite: 406 pass, zero fail, one Windows Ruby skip; the
  equivalent Ruby fixture was executed successfully on the Mac.
- MTG plan-reason repair and founder-outcome contracts: 12 pass. The narrow
  reporting fix changes no mutation, qualification, or authority behavior.

## iOS Build 313

- Exact merged main above, isolated Mac checkout
  `~/grookai_vault_testflight_313_sealed`; primary checkout untouched.
- Bundle `com.cesar.grookaivault`, version `1.0.0`, build `313`.
- Both sealed flags verified true in generated Xcode configuration. Other
  configuration values and credentials are not printed in this checkpoint.
- Archive: `build/ios/archive/GrookaiVault-1.0.0-313.xcarchive`.
- Deep/strict code-signature verification passed. Runner executable SHA-256:
  `fcb3b7a9bdda35862af7d6b1c274f843e9db0b42f29b79d304ea7277efb383a4`.
- Initial SSH build failed accessing the existing signing keychain. The same
  source/flags archived successfully in the established Mac desktop session.
  No certificate, permission, password, or signing configuration was changed.
- Apple accepted upload. Readback at `2026-09-07T12:05:17Z`: `VALID`,
  `IN_BETA_TESTING`, `autoNotifyEnabled=true`, internal Friends and Family
  membership confirmed. Build ID `c1e519c0-f870-4872-aa81-a9220deb114c`.
- Build-specific TestFlight notes were written and read back exactly. No App
  Store version attachment, submission, or audience expansion was performed.
- Same-source iPhone 17 Pro simulator build and launch pass; retained screenshot
  `ios313_start.png` shows the normal signed-out screen, not a blank startup.
  This does not claim signed-in sealed navigation on a physical iPhone.
- Final Apple evidence: `grookai_313_testflight_readback.json` and
  `grookai_313_finalization.json` in the operator root. Archive, upload,
  simulator and test logs are retained there. Mac has about 13 GiB free;
  original archives and the dirty primary checkout were not cleaned up.
- Prior build 312 is available to internal `Friends and Family` only; preserve
  that audience. Public external beta groups were not activated by this work.

## Remaining Gates

1. Distribution is complete to the existing internal TestFlight group. A
   physical-iPhone signed-in sealed browse remains a separate device acceptance
   check; no public App Store submission was made.
2. Preserve 35 missing-image exclusions: 32 have no source image; three
   source images remain unavailable. No guessed package images or substitutes.
3. Preserve stale/missing-price and qualification exclusions. The three
   August 31 quotes must be withheld September 8 unless genuinely refreshed.
   The fresh proposal has three added and two removed qualified products;
   it is not a publication release and requires image/release reconciliation.
4. MTG `slz`: read-only plan contains 363 cards and one set, no collisions.
   Payload `9b0ab65a13b186910bc4dff88ca101500e27fe1cd71c13e688c25c0fd30b4b68`.
   No canonical or image writes. The preserved plan's `already_exact_complete`
   reason is a reporting defect; the actual database state is absent. A narrow
   tested repair now reports `eligible_absent_plan`; old evidence is unchanged.
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
