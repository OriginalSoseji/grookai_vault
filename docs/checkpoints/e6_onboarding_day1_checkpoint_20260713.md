# E6 Onboarding Day-1 Checkpoint

Date: 2026-07-13
Branch: `main`

## Decision

E6 onboarding UI is no longer a day-1 launch blocker in repo state.

The earlier launch gap note said E6 onboarding UI remained the largest
product-experience gap. That is now stale: current `main` includes the mobile
onboarding ladder overlay, the Supabase service wrapper, owned/wanted rung
recording, collector suggestions, and founder metrics readouts.

## Repo Evidence

- `lib/main_shell.dart` creates `OnboardingLadderService`, probes
  `onboarding_ladder_state_v1`, and renders `OnboardingLadderOverlay` on the
  Pulse/Search landing surfaces when the ladder is incomplete.
- `lib/widgets/onboarding/onboarding_ladder_sheet.dart` implements the visible
  3-step ladder:
  - Add a card to your vault through scan, with search fallback.
  - Add a card you are chasing through Search.
  - Follow suggested collectors ranked from overlap/proximity data.
- `lib/services/onboarding/onboarding_ladder_service.dart` calls
  `onboarding_ladder_state_v1`, `onboarding_record_rung_v1`,
  `onboarding_skip_v1`, and `onboarding_collector_suggestions_v1`.
- `lib/card_detail_screen.dart` records owned-card completion after
  `VaultCardService.addOrIncrementVaultItem`.
- `lib/services/network/card_engagement_service.dart` records wanted-card
  completion after existing Want actions.
- `lib/screens/founder/founder_metrics_screen.dart` exposes onboarding ladder
  conversion rows from `onboarding_ladder_events`.
- `supabase/migrations/20260709100000_product_evolution_e6_onboarding_contracts_v1.sql`
  creates owner-only onboarding state/events plus the authenticated RPCs.
- `supabase/migrations/20260709110000_product_evolution_e6_collector_suggestions_v1.sql`
  creates the authenticated, gated, non-popularity collector suggestion RPC.

## Launch Position

The E6 ladder can ship as the day-1 activation helper, subject to the same
environment readiness expectations as the rest of the app:

- Apply both E6 migrations in staging/production before enabling broad launch
  traffic.
- Smoke-test a signed-in new-account session through owned, wanted, loop
  promise, and follow steps.
- Confirm the UI remains non-blocking: RPC failures must not prevent normal
  shell use.

No extra day-1 E6 app implementation is required from the repo. Further polish,
copy tuning, analytics dashboards, and additional suggestions can remain
post-launch work.

## Scanner Note

Scanner V5 proof is deliberately not advanced by this checkpoint. The current
instruction is to skip scanner work and return to it later.
