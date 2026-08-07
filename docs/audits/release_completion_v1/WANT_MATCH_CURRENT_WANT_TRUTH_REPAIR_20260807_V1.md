# Want Match Current-Want Truth Repair V1

## Status

`PRODUCTION_APPLIED_AND_VERIFIED / JOURNEY_C_STILL_PARTIAL`

## Release Finding

Final-candidate Android testing exposed two old Want Match items in Pulse. Opening one card showed `Want this card`, proving the current app intent no longer agreed with the retained match and event rows.

The production read-only preflight found:

- 2 total durable Want Match rows;
- 2 active rows;
- 2 retained `want_match_available` event rows;
- 2 active rows without an exact current `user_card_intents.want=true` row.

The two affected cards are Piplup and Blastoise & Piplup-GX. User and row identifiers are excluded from this audit; stable truncated SHA-256 references are retained in `want_match_current_want_production_preflight_v1.json`.

## Root Cause

`user_card_intents` is the app's current intent authority, while durable matches and historical Pulse events intentionally outlive their initiating write. The database had no synchronous opt-out transition and no scheduled stale cleanup. Pulse eligibility also accepted historical Want Match events without proving the durable match was still active and backed by a current exact-card want.

PR review exposed two additional recurrence paths. A queued notification could remain deliverable after opt-out, and an engine activation based on a stale candidate snapshot could commit after the opt-out trigger had already run. The delivery worker also lacked a final evidence check immediately before its FCM point of no return.

## Repair

Migration `20260807043000_want_match_current_want_truth_boundary_v1.sql`:

1. Defines exact current-want truth from `user_card_intents`.
2. Replaces local-community wishlist signals with that same predicate.
3. Marks active matches stale immediately when a want is disabled, deleted, or moved.
4. Serializes every active insert/reactivation against the exact current intent and converts unsupported activation to retained stale history.
5. Cancels queued, unstarted instant and daily Want Match delivery when current evidence is removed.
6. Rechecks current evidence both while claiming an outbox row and at the final pre-FCM send-start boundary.
7. Uses deterministic intent-to-outbox lock order and rejects duplicate send starts.
8. Filters Want Match Pulse events unless the referenced match remains active and the current exact want still exists.
9. Marks existing active/current-want and queued-delivery drift terminally stale/failed without deleting rows.
10. Schedules the existing bounded owner-availability cleanup every 15 minutes.

Historical durable matches and card events remain stored. Re-enabling the exact want allows the deterministic engine to reactivate the same match row without creating duplicate rows or events.

## Local Proof

- The full migration history replayed from an empty local Supabase database, including migration `20260807043000`.
- Ten affected functions read back as `SECURITY DEFINER`; execute ACLs are limited to `postgres` and `service_role`, with zero `anon` or `authenticated` grants.
- Both opt-out and activation-enforcement triggers read back enabled.
- The migration retains the `*/15 * * * *` cleanup schedule. Local `pg_cron` is unavailable, so production cron readback remains required.
- Active/current-want mismatch and deliverable-without-current-evidence counts both read back as zero.
- E3 engine smoke proved current event -> want off -> queued alert cancelled -> stale/hidden -> unsupported activation rejected -> same-row reactivation.
- E3 delivery smoke proved instant dedupe and the E4 standalone-digest cutover.
- E4 read smoke proved valid evidence, pagination, privacy filtering, unread state, and cursor monotonicity.
- E4 daily smoke proved mixed Pulse authorization before opt-out and terminal cancellation after opt-out.
- The final send boundary rejected invalid evidence, accepted valid evidence once, and rejected a duplicate start.
- Targeted contracts: 19 passed, 0 failed.
- Full contract suite: 1,547 passed, 0 failed.
- Complete repository shipcheck passed: secret guard, runtime preflight with zero critical failures, operations reports, web typecheck/lint/production build, Flutter analysis, and 571 Flutter tests.
- `git diff --check`: passed.

## Production Apply And Readback

- PR `#189` merged to `main` at `5dfe6288dd449368f2c918cfb411602ef92d53ae` after every GitHub check passed and both race-condition review threads were resolved.
- A fresh production preflight proved the state was unchanged and `20260807043000` was the only pending migration.
- The migration applied successfully with SHA-256 `279ff56334079fc8858faba53eafa6d98162c7bcecc30f08f23e59c1cdf19959`.
- Both durable rows were retained and changed from `active` to `stale`.
- Both historical `want_match_available` events were retained.
- Active/current-want mismatches, invalid deliverable notifications, and stale Want Match Pulse visibility all read back as zero.
- All ten functions are `SECURITY DEFINER`, executable by `service_role`, and not executable by `anon` or `authenticated`.
- Both enforcement triggers are enabled.
- Production cron `grookai-want-match-stale-cleanup-v1` is active at `*/15 * * * *`.
- The merged `notification-dispatcher` source was deployed to production as active version `14`; its entrypoint uses `notification_dispatcher_mark_send_started_if_current_v1` at the final pre-FCM boundary.
- Function readback reports `verify_jwt=false` as configured, while an unauthenticated production probe returns `401 unauthorized` from the function's required shared-secret boundary.
- Android build 284 cold-launched against production and displayed `Caught up`; neither stale card was returned. The older-Pulse control did not reintroduce either card.

## Safety Boundaries

- No historical match or event deletion.
- No canonical identity, Vault, pricing, or ownership mutation.
- No client privilege expansion.
- Exact current intent comes only from `user_card_intents.want=true` for the same user and `card_print_id`.
- A queued or claimed row cannot cross the FCM send boundary without current evidence.
- Once send-start is recorded, it is an explicit point of no return; duplicate send starts are rejected.
- Production remained read-only during discovery and local verification.

## Exact Next Gate

Run the clean-account Journey C proof on the immutable final candidate: exact Want, generated current match, owner context, card-centered message, opt-out, database readback, and notification-boundary reconciliation. This repair closes the stale-current P0 defect, but Journey C and the 72-hour soak remain incomplete.
