# Signed-Out Mobile Card Continuation Android 20260807 V1

## Context

The frozen eight-week release contract requires first-time collectors to understand the product, browse public card data before authentication, and preserve their destination when a personal action requires sign-in.

## Problem

The mobile login surface had no public catalog path. Signed-out canonical card routes did not resolve to a public card detail, and personal card actions routed to the general Account screen without a reliable return contract. A first Samsung pass also exposed a bottom-sheet overlap with system navigation.

## Decision

Add a read-only signed-out catalog, resolve canonical GV-ID card routes publicly, gate only personalized mutations, and resume the exact pending action after authentication. Keep pricing and ownership reads disabled in guest browse. Build Android debug artifacts from a temporary public-only define file and delete that file after the build.

## Proof

- Source commit: `ff45bc07c7518daf369970bc7834aacfb2b4849f`
- Physical device: Samsung Galaxy S22 Ultra
- Side-by-side package: `com.grookai.vault`
- Locked personal package: untouched
- Public catalog: 32 returned, 24 initially rendered
- Exact card: `GV-PK-MEW-025`, Pikachu, 151 #025, Normal
- Authentication continuation: passed
- Exact pending action resume: passed
- Disposable test copy cleanup: passed, net zero
- Native custom-scheme card route: passed
- Safe-area repair: passed
- Full Flutter suite: `574/574`
- Full repository shipcheck: passed

Permanent evidence:

`docs/audits/release_completion_v1/device_android/signed_out_card_exploration_v1/2026-08-07T08-36-02/`

## Current Truths

- Android signed-out card exploration is proven on a physical production-backed debug device.
- The proof is not a final Play release build and does not replace physical-iPhone/TestFlight evidence.
- Android verified HTTPS App Links remain blocked on the authoritative Play signing certificate and matching `assetlinks.json`.
- The custom native card scheme works; HTTPS card links remain web-first.
- The existing Want Match supplemental payload proves the end-to-end dedicated-account data path on Samsung. Its generated iPhone-policy failure is preserved as raw evidence and must not be misreported as an Android functional failure.

## Invariants

- Guest browse cannot read ownership or execute mutations.
- Authentication begins only at a personal-action boundary.
- Successful authentication returns to the same exact card and resumes only the requested action.
- Exact printing context remains visible.
- No backend secret enters a mobile build.
- The locked acceptance package and personal data remain untouched.

## What Must Never Be Broken

- A signed-out collector must be able to inspect public card truth.
- A failed or cancelled sign-in must never execute the pending mutation.
- A successful continuation must not lose the card or printing identity.
- UI sheets must clear system navigation on short physical devices.
- HTTPS App Links must not be declared verified without release-certificate evidence.

## Explicit Next Gate

Produce the immutable Android/iOS release candidate, configure verified Android App Links from the real release certificate, repeat this journey on physical iPhone/TestFlight, complete operations and distribution readback, then start the 72-hour final-candidate soak.
