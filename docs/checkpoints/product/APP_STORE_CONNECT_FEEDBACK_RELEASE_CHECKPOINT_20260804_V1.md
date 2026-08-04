# App Store Connect Feedback Release Checkpoint 20260804 V1

Status: `CODE_AND_PRODUCTION_BOUNDARY_PROVEN_TESTFLIGHT_PENDING`

Code commit: `77760caf4c2f71c352ac19a65d234752362b2662`

Audit: `docs/audits/app_store_connect_feedback_v1/APP_STORE_CONNECT_FEEDBACK_AUDIT_V1.md`

## Context

Forty-two App Store Connect screenshot reports were reviewed against current
code, production behavior, Samsung runtime behavior, TestFlight state, and
release infrastructure.

## Decision

The release remains a controlled beta. Production follower truth and public
printing selection are repaired and proven. The exact-printing catalog add
repair is code-complete and Samsung-proven but not yet present in TestFlight.

Xcode Cloud remains disabled. Vercel was not redeployed during this repair.

## Current Truths

- Production follower readback is 1 follower and 4 following; Poke Javi appears
  in the follower list.
- Production migration `20260804210000` is applied.
- The governed printing RPC exposes only the Holo child for `GV-PK-CEC-215` to
  service, anonymous, and authenticated callers.
- Samsung search and the action sheet show `Holo` for Cosmic Eclipse #215.
- A controlled vault write preserved the exact Holo child ID.
- All three diagnostic copies are archived.
- The full shipcheck passes, including 563 Flutter tests.
- Samsung stays awake while USB powered with timeout `2147483647`.

## What Must Never Break

- Never silently turn a parent card into a claimed exact printing.
- Never create an unassigned copy when governed printing options exist or the
  printing lookup is unavailable.
- Never delete canonical printing identity to hide a public conflict.
- Never treat Samsung proof as TestFlight deployment proof.
- Never reactivate Xcode Cloud or trigger repeated Vercel builds merely to
  collect redundant evidence.

## Explicit Next Gate

Push and pass GitHub CI, merge normally, perform one controlled association-file
web deployment, then create one Mac-built replacement TestFlight archive. The
physical iPhone must pass startup, Wall, Binders, Messages, exact-printing
search/add, follower navigation, Price Lot share, uploaded-copy image, scanner,
and universal-link smokes before this checkpoint can be promoted.
