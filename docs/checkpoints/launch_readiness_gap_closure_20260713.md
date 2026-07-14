# Launch Readiness Gap Closure

Date: 2026-07-13
Branch: `main`
Source audit: `Grookai Vault - Launch Readiness Audit - July 13, 2026`

## Current Correction

The attached launch audit is directionally useful, but several repo-state claims
are stale after the app-wide simplification merge and existing web release work.

Confirmed already present on current `main`:

- Web telemetry exists through `/api/telemetry`, `web_events`, `TrackPageEvent`,
  and Vercel Analytics.
- Web abuse/rate-limit middleware exists for API, search, retired registry, and
  high-volume card access lanes.
- Terms/legal page exists at `/legal`.
- App Store Connect release docs and iOS privacy answer-sheet drafts exist under
  `docs/release/`.
- iOS camera/photo permission strings are product-specific.
- App-wide simplification, Pulse rename, ownership consolidation, jargon sweep,
  and expanded long-press quick actions are merged.

Confirmed gaps remaining:

- Mobile crash reporting was not wired at the time of the source audit.
  Crashlytics code-side wiring now exists; Firebase-console readback from a
  non-public build is still required before launch.
- Public `/privacy` and `/support` URLs were referenced by release docs but did
  not exist before this checkpoint.
- Android launcher label was still `grookai_vault`.
- Scanner V5 phase/gate status is now captured in
  `docs/checkpoints/scanner_v5_launch_checkpoint_20260713.md`; the service is
  reachable and fixture regression passes, but real-device launch proof is
  still required.
- Pricing timer state and production alerting need a live ops verification, not
  inference from repo files. `docs/checkpoints/mee_timer_alerting_checkpoint_20260713.md`
  adds the host-side readiness gate and records that current repo templates do
  not prove a human alert route.
- Trust/safety now has a launch-minimum block/report layer in
  `docs/checkpoints/trust_safety_minimum_block_report_20260713.md`. Follow-up
  moderation review tooling and unblock management remain post-minimum
  hardening.
- E6 onboarding UI remains the largest product-experience launch gap unless a
  separate branch has implemented it.

## Closed In This Pass

- Added `/privacy` public route with launch-draft privacy disclosures.
- Added `/support` public route with support, bug, card-data, safety-report, and
  account-deletion routing.
- Added Privacy and Support links to the web footer.
- Added Support and Privacy links to the signed-in web Account quick links.
- Added Support and Privacy actions to the Flutter Account screen.
- Moved the Android app label to `@string/app_name` and set it to `Grookai
  Vault`.

## Verification

- `npm --prefix apps/web run typecheck`
- `npm --prefix apps/web run lint`
- `flutter analyze`

## Launch Blocker Queue

1. Verify mobile Crashlytics readback from a non-public build using
   `docs/checkpoints/mobile_crash_reporting_wiring_20260713.md`.
2. Capture Scanner V5 real-device launch proof per
   `docs/checkpoints/scanner_v5_launch_checkpoint_20260713.md`; top-1/top-3
   and p50/p95 are not yet proven from a phone session.
3. Run `deploy/scripts/verify-mee-live-ops-readiness.sh` on the deployment host
   and archive the output. This must prove `grookai-mee-nightly.timer` and
   `grookai-mee-reference-refresh.timer` are active and that failures notify a
   human.
4. Trust/safety launch minimum is code-complete; apply the migration and verify
   reports/blocks in staging before broad public messaging/listing exposure.
5. Decide whether E6 onboarding UI is required for day-1 public launch or
   explicitly move it to post-launch.

## Legal Note

The privacy and terms copy in this repo is launch-draft product disclosure, not
legal advice. Public launch still needs founder/legal approval of the public
policy URLs and store privacy questionnaire.
