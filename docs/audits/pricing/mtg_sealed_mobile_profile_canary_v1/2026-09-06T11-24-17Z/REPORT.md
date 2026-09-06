# MTG Sealed Mobile Profile Canary V1

## Result

PASS. The bounded signed-in MTG sealed catalog is functionally correct and
memory-bounded in a production-profile Flutter build on a physical Samsung
device.

## Provenance

- Producer commit: `2198c9c62cd2e9a62ddf3294a8d4520d9423fd08`
- Parent `main`: `78233b9e2e9033caae00dca9c82b7367f6b8101d`
- Branch: `agent/mtg-sealed-mobile-production-canary-v1`
- Package: `com.grookai.vault`
- App version: `1.0.0+311`
- Build mode: Flutter profile, Android arm64
- Device: Samsung SM-S908U, Android 16 / API 36
- APK SHA-256:
  `AEA5F8EFE4F4D76D1747F399551380E397848D3088D8E877A7C7E516BB39A33B`
- APK size: 62,258,943 bytes
- Feature flag: `MTG_SEALED_CLIENT_V1_ENABLED=true`

The APK used public mobile configuration only. No database, Storage, pricing,
Vault, approval, or migration write occurred during this canary.

## Problem And Repair

The unmodified production path rendered the set catalog through nested,
shrink-wrapped grids. Opening MTG Sets eagerly created image widgets for 946
sets and produced approximately 3.0 GB total PSS, including 2.58 GB graphics
memory.

The repair replaces the eager nested grids with a viewport-lazy sliver grid.
It also loads only the selected game's set catalog and prevents stale responses
from replacing a newly selected game after rapid tab changes. Existing callers
that request the combined catalog retain their prior behavior.

## Functional Proof

- App cold-launched successfully in 1,543 ms.
- Pokémon Sets loaded 310 sets.
- MTG Sets loaded 946 sets.
- MTG Sealed rendered all 24 bounded products exactly once.
- All 24 products displayed a market price.
- All inspected images rendered from signed self-hosted Storage URLs.
- Search for `Arena Starter Kit` returned four exact products.
- The app returned to Pulse with the process alive.
- Runtime log scan found zero fatal, ANR, OOM, image-codec, TLS, socket, Flutter,
  or image-load errors.

## Performance Proof

| State | Total PSS | Graphics |
| --- | ---: | ---: |
| Pulse baseline | 348,981 KB | 151,444 KB |
| Pokémon Sets | 433,695 KB | 197,788 KB |
| MTG Sets | 418,527 KB | 200,372 KB |
| Initial MTG Sealed | 459,295 KB | 217,708 KB |
| All 24 products traversed | 479,726 KB | 253,344 KB |
| Peak after search | 506,603 KB | 279,212 KB |
| Returned to Pulse | 496,065 KB | 280,388 KB |

Compared with the original MTG Sets/Sealed peak, total PSS fell 83.27% and
graphics memory fell 89.16%.

Frame statistics over the measured traversal:

- 104 total frames
- 16 janky frames under Android's primary metric (15.38%)
- 50th percentile: 5 ms
- 90th percentile: 14 ms
- 95th percentile: 19 ms
- 99th percentile: 23 ms
- 7 missed-vsync frames

The UIAutomator polling harness gives conservative readiness bounds because
each poll performs a complete hierarchy dump. These are not direct network-only
latency measurements: Pokémon Sets 3,047 ms, MTG Sets 3,630 ms, initial MTG
Sealed 12,577 ms, and filtered search 6,122 ms.

## Tests

- Focused analyzer: passed with no issues.
- Relevant Flutter tests: 21/21 passed.
- Full `npm run shipcheck`: passed in 259.4 seconds, including Flutter 661/661.
- Commit-hook `npm run shipcheck`: passed in 266.3 seconds.
- The historical `npm run precommit:shipcheck` alias is not present; its failed
  invocation exited before running tests and is not a product failure.

## Build Trust Note

The local Android dependency fetch was intercepted by Norton TLS inspection.
The build used a process-local copy of the Android Studio JBR truststore with
the Windows Norton root imported. Certificate and hostname verification stayed
enabled. No repository Gradle, Java, or trust configuration was changed.

## Boundaries

- The catalog remains bounded to 24 sealed products.
- Anonymous MTG sealed access remains denied.
- RPC V3 and the trusted image signer remain the client interfaces.
- No external image fallback was introduced.
- Migration `20260905120000_mtg_sealed_image_dimension_constraint_repair_v1.sql`
  remains prepared and unapplied.
- This canary proves Android profile behavior; it does not itself prove iOS or
  TestFlight distribution.

## Exact Next Gate

Merge the tested producer source through protected GitHub checks, build the
same merged source on the governed Mac, upload a new TestFlight build, and run
the bounded signed-in MTG sealed smoke test on iPhone. Do not apply the pending
dimension constraint migration as part of the client rollout.
