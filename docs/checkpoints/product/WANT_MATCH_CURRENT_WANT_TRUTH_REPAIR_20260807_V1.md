# Want Match Current-Want Truth Repair Checkpoint V1

## Context

The immutable release candidate was being exercised through Journey C on Android build 284. Pulse displayed historical Want Match cards that the viewer no longer wanted.

## Problem

Durable match/event history was treated as current product truth. Turning off an exact card want did not synchronously stale its active matches, and Pulse did not re-prove current intent before display.

## Risk

- Collectors could see a match for a card they no longer want.
- Current Pulse state could disagree with Card Detail.
- Deleting history to hide the issue would destroy valuable audit and lifecycle evidence.
- Treating `wishlist_items` as the current authority would preserve drift from the app's `user_card_intents` contract.

## Decision

Use exact `user_card_intents.want=true` as the sole current-want authority. Retain durable matches and card events, transition unsupported active matches to `stale`, and require current intent at the Pulse read boundary.

## Alternatives Rejected

- **Delete old matches/events:** rejected because historical evidence must remain durable.
- **Hide only in the client:** rejected because unread counts and every client would still consume false database truth.
- **Use `wishlist_items` as authority:** rejected because production contains legacy drift and the app writes `user_card_intents`.
- **Wait for seven-day cleanup:** rejected because an explicit opt-out must take effect immediately.
- **Patch only the two production rows:** rejected because it would not prevent recurrence.

## Migration

- Path: `supabase/migrations/20260807043000_want_match_current_want_truth_boundary_v1.sql`
- SHA-256: `f578b0c4daa8f5da46a1b7e455591943fe19d2a01259c0d336786e5cb8b229da`
- Base candidate: `33d7ff50bda428439c664c7c6db427b7a66abd9a`
- Production status: pending merge and controlled apply.

## Current Truths

- Production has two durable Want Match rows and two historical availability events.
- Both rows are active without a current exact want and must become stale.
- Local migration readback has zero active/current-want mismatches.
- Local E3 and E4 rollback-only journeys pass.
- The full Node contract suite passes 1,544/1,544.

## Invariants

- Current intent is exact user plus exact `card_print_id`.
- Match and event history is retained.
- An explicit want opt-out immediately removes candidate and Pulse eligibility.
- Reactivation reuses the durable row and does not duplicate events.
- Private, muted, unrelated, and cursor-invalid Pulse data remains excluded.

## What Must Never Be Broken

- Never infer current intent from an old event or durable match.
- Never delete match/event history to repair current visibility.
- Never let client filtering substitute for the database eligibility boundary.
- Never broaden anonymous, authenticated, or service privileges during this repair.
- Never use this migration to mutate canonical identity, Vault, pricing, or ownership data.

## Evidence

- `../../audits/release_completion_v1/WANT_MATCH_CURRENT_WANT_TRUTH_REPAIR_20260807_V1.md`
- `../../audits/release_completion_v1/want_match_current_want_production_preflight_v1.json`
- `../../audits/release_completion_v1/want_match_current_want_local_verification_v1.json`

## Explicit Next Gate

Merge and apply the exact migration, reconcile retained row/event counts and stale transitions, then repeat the final-candidate Android Pulse read. Journey C remains partial until the clean-account exact Want-to-match-to-message journey is separately proven.
