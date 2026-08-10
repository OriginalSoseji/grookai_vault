# Final Candidate 289 Journeys A, C, and F

## Candidate

- App source: `a8ec3d27808fd100cbb8e544032ee479e9632f24`
- TestFlight build: `1.0.0 (289)`
- Device: physical iPhone 17 Pro
- Installation source: TestFlight
- Exact card: `GV-PK-CEC-214`
- Subject fingerprint: `83ca78ab0d151a7cbf9b388e73e1084060d3e5a2832bd4313048216b1fcd49a6`

## Journey A And F Device Proof

The signed-out product flow opened the catalog, found the exact Blastoise &
Piplup-GX card, opened its card detail, and attempted Want. The app blocked the
mutation with an action-specific sign-in explanation, preserved the exact-card
destination, authenticated the disposable account, and returned to the same
card.

The product flow succeeded. The raw XCUITest result is retained as failed
because its final harness assertion looked for a global Account control while
the app correctly remained on the restored card-detail surface. That assertion
occurred after all required product states were captured. The test was not
rerun because doing so would have duplicated the governed production mutation.

- Journey A physical signed-out exploration and continuation: `proven`
- Journey A fresh-human ten-second comprehension: `open`
- Journey F signed-out locked-feature behavior: `proven`

## Clean Account Setup

The app created the disposable public profile and enabled local discovery
through product UI. The physical test passed, and read-only database
reconciliation found exactly one public/shared profile and one exact local
setting. Raw credentials remain private.

## Journey C

The synchronized candidate completed the full exact-card flow:

1. Want was enabled once for `GV-PK-CEC-214`.
2. The scheduled engine created one exact Want Match.
3. Pulse displayed Blastoise & Piplup-GX, Poke Javi, same-region/trade context,
   and Cosmic Eclipse `#214`.
4. One card-centered message was sent from the match.
5. Want was disabled through product UI.
6. The historical match became stale with reason `canonical_want_removed`.
7. The stale match disappeared from current and older Pulse views.

The authoritative read-only verifier passed with zero findings. It reconciled
one `want_on`, one match, one available event, one exact card-centered message,
one `want_off`, final current Want `false`, zero active post-opt-out matches,
zero stale Pulse rows, zero invalid deliverable notifications, zero post-opt-out
deliveries, and zero event-emission failures.

- Journey C: `proven`
- Verifier status: `passed`
- Completion allowed by Journey C policy: `true`

## Privacy And Mutation Boundaries

- Credentials, email, user ID, device identifier, raw message, and private logs
  remain outside source control.
- Permanent evidence contains only sanitized facts, hashes, and the subject
  fingerprint.
- Database verification used a read-only transaction.
- The current Want is false; the historical match and message remain as valid
  append-only journey evidence.
- No public release or soak start occurred.

## Evidence

- `signed_out_af_summary.json`
- `private_evidence_hashes.json`
- `WANT_MATCH_REPORT.md`
- `want_match_summary.json`
- `want_match_run_plan.json`
- `want_match_artifact_hashes.json`
- `artifact_hashes.json`

## Gate Result

Journey C and Journey F are proven on synchronized TestFlight build `289`.
Journey A remains partial only because genuine fresh-human comprehension is not
yet recorded. The cross-platform state matrix, Google Play readiness, and the
72-hour soak remain open.
