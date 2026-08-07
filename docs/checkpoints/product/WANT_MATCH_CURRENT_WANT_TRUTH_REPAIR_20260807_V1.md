# Want Match Current-Want Truth Repair Checkpoint V1

## Context

The immutable release candidate was being exercised through Journey C on Android build 284. Pulse displayed historical Want Match cards that the viewer no longer wanted.

## Problem

Durable match/event history was treated as current product truth. Turning off an exact card want did not synchronously stale its active matches, Pulse did not re-prove current intent before display, queued alerts remained deliverable, and concurrent engine activation could recreate an active mismatch after opt-out.

## Risk

- Collectors could see a match for a card they no longer want.
- Collectors could receive a queued push after opting out.
- A stale engine snapshot could reactivate a row after the opt-out transition.
- Current Pulse state could disagree with Card Detail.
- Deleting history to hide the issue would destroy valuable audit and lifecycle evidence.
- Treating `wishlist_items` as the current authority would preserve drift from the app's `user_card_intents` contract.

## Decision

Use exact `user_card_intents.want=true` as the sole current-want authority. Retain durable matches and card events, transition unsupported active matches to `stale`, require current intent at Pulse and delivery boundaries, cancel queued unstarted alerts, serialize active transitions, and recheck evidence immediately before FCM send-start.

## Alternatives Rejected

- **Delete old matches/events:** rejected because historical evidence must remain durable.
- **Hide only in the client:** rejected because unread counts and every client would still consume false database truth.
- **Use `wishlist_items` as authority:** rejected because production contains legacy drift and the app writes `user_card_intents`.
- **Wait for seven-day cleanup:** rejected because an explicit opt-out must take effect immediately.
- **Check only when an alert is queued:** rejected because evidence can change during quiet hours, retries, or dispatch.
- **Rely on PostgreSQL deadlock recovery:** rejected for the delivery boundary; final send now follows deterministic intent-to-outbox lock order.
- **Patch only the two production rows:** rejected because it would not prevent recurrence.

## Migration

- Path: `supabase/migrations/20260807043000_want_match_current_want_truth_boundary_v1.sql`
- SHA-256: `279ff56334079fc8858faba53eafa6d98162c7bcecc30f08f23e59c1cdf19959`
- Base candidate: `33d7ff50bda428439c664c7c6db427b7a66abd9a`
- Merged main SHA: `5dfe6288dd449368f2c918cfb411602ef92d53ae`
- Production status: applied and read back successfully on `2026-08-07`.

## Current Truths

- Production retains two durable Want Match rows and two historical availability events.
- Both rows are now stale; zero active/current-want mismatches remain.
- Zero invalid deliverable outbox rows and zero stale Want Match Pulse rows remain.
- Production function, trigger, grant, migration-history, and cron readback passed.
- Android build 284 cold-launch readback excludes both stale cards.
- Local migration readback has zero active/current-want mismatches.
- Local E3 engine/delivery and E4 read/daily rollback-only journeys pass.
- Current evidence is required at claim and final send-start, and duplicate send-start is rejected.
- The full Node contract suite passes 1,547/1,547.

## Invariants

- Current intent is exact user plus exact `card_print_id`.
- Match and event history is retained.
- An explicit want opt-out immediately removes candidate and Pulse eligibility.
- Queued instant and daily delivery becomes terminal before FCM when current evidence is removed.
- Active insertion/reactivation cannot remain current without the exact intent.
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
- `../../audits/release_completion_v1/want_match_current_want_production_preflight_v2.json`
- `../../audits/release_completion_v1/want_match_current_want_production_apply_output_v1.txt`
- `../../audits/release_completion_v1/want_match_current_want_production_readback_v1.json`
- `../../audits/release_completion_v1/device_android/WANT_MATCH_CURRENT_WANT_POST_APPLY_ANDROID_20260807_V1.md`

## Explicit Next Gate

Run the clean-account exact Want-to-match-to-message journey on the immutable final candidate with database readback. Journey C remains partial until that separate end-to-end proof passes.
