# Want Match Current-Want Truth Repair V1

## Status

`LOCAL_VERIFIED / PRODUCTION_APPLY_PENDING`

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

## Repair

Migration `20260807043000_want_match_current_want_truth_boundary_v1.sql`:

1. Defines exact current-want truth from `user_card_intents`.
2. Replaces local-community wishlist signals with that same predicate.
3. Marks active matches stale immediately when a want is disabled, deleted, or moved.
4. Filters Want Match Pulse events unless the referenced match remains active and the current exact want still exists.
5. Marks existing active/current-want mismatches stale without deleting rows.
6. Schedules the existing bounded owner-availability cleanup every 15 minutes.

Historical durable matches and card events remain stored. Re-enabling the exact want allows the deterministic engine to reactivate the same match row without creating duplicate rows or events.

## Local Proof

- Migration applied to the local Supabase history.
- Six expected functions read back.
- All six affected functions are `SECURITY DEFINER`; execute grants are limited to `postgres` and `service_role`, with zero `anon` or `authenticated` grants.
- Opt-out trigger read back enabled.
- Scheduled cleanup read back active at `*/15 * * * *`.
- Active/current-want mismatch count read back as zero.
- E3 rollback-only journey proved current event -> want off -> stale/hidden -> same-row reactivation.
- E4 rollback-only Pulse journey proved valid Want Match evidence, pagination, privacy filtering, unread state, and cursor monotonicity.
- Targeted contracts: 9 passed, 0 failed.
- Full contract suite: 1,544 passed, 0 failed.
- Complete repository shipcheck passed: secret guard, runtime preflight with zero critical failures, operations reports, web typecheck/lint/production build, Flutter analysis, and 571 Flutter tests.
- `git diff --check`: passed.

## Safety Boundaries

- No historical match or event deletion.
- No canonical identity, Vault, pricing, or ownership mutation.
- No client privilege expansion.
- Exact current intent comes only from `user_card_intents.want=true` for the same user and `card_print_id`.
- Production remained read-only during discovery and local verification.

## Exact Next Gate

Merge the repair from a frozen commit, apply only migration `20260807043000`, and reconcile production before/after counts. Completion requires:

- migration-history readback;
- function, trigger, grant, and cron readback;
- both existing rows retained and transitioned from active to stale;
- both historical event rows retained;
- zero active/current-want mismatches;
- the founder Pulse no longer returns either stale event;
- final-candidate Android re-smoke confirms the stale cards are absent.

This closes one P0 data-truth defect. It does not complete Journey C or authorize the 72-hour soak.
