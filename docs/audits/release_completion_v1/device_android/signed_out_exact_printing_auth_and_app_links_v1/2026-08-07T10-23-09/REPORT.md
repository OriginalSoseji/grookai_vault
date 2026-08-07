# Signed-Out Exact-Printing Authentication And Android App Links V1

## Decision

Status: `PASS`

Source commit `1a24a22070d72c5352abe7cb47684229fa8b40dc` preserves exact child-printing identity across the signed-out authentication root swap and publishes Android HTTPS App Link authority for the signed release package. A fresh-install physical Samsung journey created the selected Normal printing, opened its private copy screen, and removed it through the product UI. Database readback reconciled to zero active test copies.

This closes the Android exact-printing continuation and App Link implementation gates. It does not complete physical-iPhone/TestFlight verification, cross-platform state coverage, store assignment, or the non-backdated 72-hour soak.

## Root Cause

`GV-PK-MEW-025` has three selectable child printings. The prior signed-out flow authenticated before resolving that exact printing. After the root swap, the resumed action correctly reached the card but then hit the existing `Choose the exact printing` guard, so no ownership write occurred. The selected child identity was also absent from the in-memory pending-action request.

## Repair

- Exact printing resolves before authentication for `Add to Vault`.
- Ambiguous parent cards remain fail-closed until the collector chooses a printing.
- The pending request retains `card_printing_id`, printing GV-ID, and finish label.
- The authenticated canonical route restores the same exact printing before resuming the action.
- Push-notification registration remains deferred while a personal card action is pending or active.
- Authentication route cleanup and canonical-card routing occur in separate frames to avoid stale navigator state.
- Add failures now emit a bounded card-ID diagnostic without credentials or tokens.

## Physical Samsung Proof

1. Cleared the disposable `com.grookai.vault` package and cold-opened `grookaivault://card/GV-PK-MEW-025`.
2. Confirmed the signed-out card exposed Normal, Reverse Holo, and Cosmos Holo as independent choices.
3. Selected `Normal` before choosing `Add to Vault`.
4. Confirmed the action-specific sign-in continuation.
5. Authenticated with the dedicated release-journey account.
6. Confirmed the root swap returned to Pikachu with the selected Normal printing.
7. Confirmed `vault.mobile.add.begin` executed once and no notification permission prompt interrupted the action.
8. Confirmed the private copy screen displayed `Printing: Normal` and one active raw copy.
9. Removed the disposable copy through `Remove copy` / `Remove all`.
10. Confirmed the exact card returned to `Add to Vault` and database readback reported zero active rows.

## Database Reconciliation

- Canonical card: `GV-PK-MEW-025` / Pikachu.
- Exact printing: `GV-PK-MEW-025-STD` / `normal`.
- Test copy: `GVVI-FA55C026-000005`.
- Created: `2026-08-07T16:23:56.761411+00:00`.
- Archived: `2026-08-07T16:24:14.384566+00:00`.
- Active exact-card rows after cleanup: `0`.
- Account email, user UUID, password, tokens, and device serial are excluded.

## Android App Link Authority

- Package: `com.grookai.vault`.
- Relation: `delegate_permission/common.handle_all_urls`.
- Host: `grookaivault.com`.
- Release certificate SHA-256: `51:E5:18:EF:64:7B:2B:D5:C1:C9:1D:3D:00:D0:8E:1F:E3:19:2A:F6:33:B2:AF:67:41:A6:7F:DC:E8:72:E0:33`.
- `assetlinks.json` and the Android `autoVerify` manifest routes cover canonical card, collector, set, GVVI, Dex, Pulse/feed, and Binder routes.
- Debug signing cannot prove domain verification. Final readback requires the signed CI APK after the web artifact is deployed.

## Verification

- Physical Samsung fresh-install exact-printing journey: passed.
- Exact ownership database write/readback: passed.
- Product-UI cleanup and zero-active-row readback: passed.
- Locked acceptance package: untouched.
- Full `npm run shipcheck`: passed twice after the final repair.
- Flutter tests: `579/579` passed.
- Flutter analyzer: passed.
- Node contracts and production-backed runtime preflight: passed with governed deferred debt only.
- Strict web typecheck, lint, and production build: passed.
- Secret packaging guard and diff checks: passed.

## Evidence

- `01_exact_printing_write_completed.png`
- `01_exact_printing_write_completed.xml`
- `02_post_cleanup.png`
- `02_post_cleanup.xml`
- `03_db_reconciliation.json`
- `04_filtered_runtime_log.txt`
- `summary.json`
- `ARTIFACT_HASHES.sha256`

## Exact Next Gate

Merge source commit `1a24a22070d72c5352abe7cb47684229fa8b40dc`, verify the exact production `assetlinks.json`, build and install the signed APK from that merged SHA, prove Android domain verification and the same journey on the signed candidate, then complete the physical-iPhone/TestFlight, journey, state-matrix, operations, distribution, and 72-hour soak gates without backdating evidence.
