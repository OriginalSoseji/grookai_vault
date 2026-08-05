# Flutter Pricing Device Readiness Report

## Outcome

The Production V1 Flutter candidate is ready for the post-canary migration
and device-proof gate. It is not deployed and it is not yet production-ready.

The Samsung smoke proved that the app starts, signed-in data loads, exact
printing identity survives navigation, unavailable pricing fails honestly,
and the eight required Flutter surfaces can be reached without fatal errors.
Actual governed price rendering remains unproven because the two frozen
read-model migrations have not been applied.

## Provenance

| Item | Value |
| --- | --- |
| Base `origin/main` | `35bcb8bb61ba1e048bfd1387a1edd00fb41b2bf4` |
| Producing code commit | `725aa1fc1d320a4c2a4e3702c4c0a147249f2403` |
| Branch | `agent/flutter-pricing-device-proof-v1` |
| APK SHA-256 | `de3b4c2f2659a4da4fd8111f96c9e60f46e8068a4e768758bd7150c793a363d4` |
| APK bytes | `168026470` |
| Package | `com.grookai.vault` |
| Version | `1.0.0 (21)` |
| Signing certificate SHA-256 | `e9575fdd80e4bc1b4e5a80e3638c76f963ae2618db4f71f95d5a0022bc7089c2` |
| Device | Samsung SM-S908U, Android API 36 |

## Corrections Made

Five narrow commits prepared the candidate:

1. `fcc8541b5` hardened ADB discovery, duplicate pricing-row rejection, and
   unavailable-price semantics.
2. `f12afb24c` removed misleading TCGPlayer attribution from an unavailable
   private-Vault total.
3. `927d74c22` preserved exact printing labels in Vault artwork, Search, and
   Compare entry states.
4. `053d501ed` kept the Compare action above bottom navigation on the Samsung
   viewport.
5. `725aa1fc1` preserved exact card-printing context from Search, Card Detail,
   Set, and Dex into Compare and prohibited parent-price fallback for a missing
   exact child price.

## Samsung Surface Proof

| Surface | Pre-migration result |
| --- | --- |
| Flutter Network / Pulse | Loaded signed-in; no startup or fatal error |
| Private Vault | Loaded 1,120 cards; unavailable total shown without fake source |
| Search / grid | Loaded Pikachu results; exact Holo and multi-printing states distinct |
| Card Detail | Displayed `Pikachu - Holo`, set, number, and rarity |
| Set grid | Loaded the 151 set without an error |
| Compare | Preserved `Printing: Holo`; action remained above navigation |
| Public collector | Signed-in public collector surface loaded |
| Vault item | Displayed exact Holo printing and exact owned-copy identity |

The candidate intentionally showed `Value pending` or `Price unavailable`
where governed pricing was unavailable. It did not fabricate a price or attach
TCGPlayer provenance to an unproven value.

## Verification

| Check | Result |
| --- | --- |
| Flutter analyze | passed, no issues |
| Full Flutter test suite | `570 / 570` passed |
| Pricing/device focused tests | passed |
| Full repository contract suite | passed |
| Web typecheck, lint, and production build | passed |
| Release secret packaging check | passed |
| Runtime preflight | `PASS_WITH_DEFERRED_DEBT`, zero critical failures |
| Repository shipcheck | passed after every accepted code commit |
| Samsung in-place install | passed; session and app data preserved |
| Fatal device logs | none observed during the smoke |

## Deferred Maintenance

The Android build reports future minimum-version warnings for Gradle, Android
Gradle Plugin, and Kotlin. These are maintenance debt, not failures of this
candidate. They must be scheduled separately from the frozen pricing release
unless a future toolchain makes them build-blocking.

## Boundaries Preserved

- No database migration was applied.
- No production database write was made.
- No production client was deployed.
- No TestFlight build was uploaded.
- No signed-in full pricing publication was activated.
- Anonymous pricing remains denied.
- Raw screenshots containing account or Vault information were not committed.

## Remaining Proof

After the terminal pricing canary passes, the release must still:

1. rerun the strict linked migration preflight from a clean integration SHA;
2. apply exactly `20260728130000` and `20260728133000`;
3. verify schema, grants, RLS, signed-in reads, anonymous denial, and rollback;
4. capture actual amount, currency, source, freshness, exact printing,
   timestamps, `From`, provenance, and Vault totals on all supported surfaces;
5. run the same surface matrix on iPhone;
6. upload an exact-SHA iOS archive with its dSYM to TestFlight;
7. begin a bounded signed-in rollout, without enabling anonymous pricing.

## Exact Next Gate

At or after `2026-08-08T07:51:54.064Z`, plus final-slot completion grace, run
the terminal observer. A passing observer authorizes the two-migration package
and the execution packet in `IOS_TESTFLIGHT_EXECUTION_PACKET.md`. A failure
must be preserved and investigated without applying migrations or deploying
this candidate.
