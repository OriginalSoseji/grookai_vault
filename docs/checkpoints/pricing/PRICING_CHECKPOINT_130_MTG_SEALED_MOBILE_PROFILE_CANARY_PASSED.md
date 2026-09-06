# Pricing Checkpoint 130: MTG Sealed Mobile Profile Canary Passed

## Context

Checkpoint 129 activated the bounded signed-in MTG sealed web client and made
mobile release/profile evidence the next gate. The first physical-device
profile pass exposed severe memory growth despite correct data and images.

## Problem

The Sets screen eagerly rendered hundreds of off-screen set covers through
nested shrink-wrapped grids. MTG's 946-set catalog drove the Flutter process to
approximately 3.0 GB total PSS and made a production mobile rollout unsafe.
The page also waited on unrelated game catalog RPCs before showing the selected
game.

## Risk

Shipping the functionally correct path unchanged could cause device memory
pressure, image failures, slow navigation, and process termination on collector
devices. A broad refactor could also change existing all-game catalog behavior
or weaken the sealed data and image boundaries already proven in production.

## Decision

Use viewport-lazy sliver rendering for the set grids and request only the
currently selected game's catalog. Preserve the existing combined-catalog
service behavior for callers that do not specify a game. Ignore stale async
responses after a tab switch.

## Authority And Provenance

- Producer commit: `2198c9c62cd2e9a62ddf3294a8d4520d9423fd08`
- Parent `main`: `78233b9e2e9033caae00dca9c82b7367f6b8101d`
- Branch: `agent/mtg-sealed-mobile-production-canary-v1`
- Android package/version: `com.grookai.vault`, `1.0.0+311`
- Physical device: Samsung SM-S908U, Android 16 / API 36
- APK SHA-256:
  `AEA5F8EFE4F4D76D1747F399551380E397848D3088D8E877A7C7E516BB39A33B`

## Current Truths

- The Android production-profile canary passed.
- Pokémon Sets loads 310 rows and MTG Sets loads 946 rows.
- All 24 bounded MTG sealed products render exactly once with market prices.
- Signed self-hosted images and the four-result Arena Starter Kit search work.
- Observed peak PSS is 506,603 KB, down 83.27% from the original path.
- Runtime logs contain zero matching fatal, ANR, OOM, image, TLS, socket, or
  Flutter errors.
- Full repository shipcheck passed twice on the producer source, including
  Flutter 661/661 both times.
- No database, Storage, pricing, Vault, approval, or migration write occurred.

## Invariants

- Anonymous access remains denied.
- The mobile client remains bounded to 24 sealed products.
- RPC V3 and the trusted signer remain the only client data interfaces.
- Self-hosted images remain mandatory; no provider-image fallback was added.
- Existing all-game catalog callers retain their existing service behavior.
- The dimension constraint repair remains a separate, unapplied schema gate.
- iOS/TestFlight must be produced from merged, protected source and proven
  independently.

## Verification

- Focused analyzer: passed.
- Relevant Flutter tests: 21/21.
- Full shipcheck: passed twice; Flutter 661/661.
- Physical Samsung functional traversal: passed.
- Memory and frame telemetry: captured.
- Screenshot and UI hierarchy evidence: preserved and hashed.

## Permanent Evidence

- `docs/audits/pricing/mtg_sealed_mobile_profile_canary_v1/2026-09-06T11-24-17Z/`

## Exact Next Gate

Merge the tested producer commit through protected GitHub checks. Build and
upload a new TestFlight binary from the merged source, then perform the same
bounded signed-in MTG sealed smoke test on iPhone. Do not apply migration
`20260905120000` as part of that rollout.
