# Signed-Out Card Authentication Root-Swap Repair Android V1

## Decision

Status: `PASS`

The physical Samsung journey proves that an exact signed-out card action survives authentication replacing the application root. Source commit `21add8fb8b62808124b57329a28ec922d84a0902` also repairs the two related review findings: web Google OAuth now uses the current web origin, and a pushed general sign-in continuation is removed after authentication.

This closes the three review findings for the release branch. It does not replace physical-iPhone/TestFlight, authoritative Android App Link, distribution, or 72-hour final-candidate evidence.

## Physical Journey

1. The signed-out app cold-opened `grookaivault://card/GV-PK-MEW-025`.
2. Pikachu from 151, card 025/165, Normal printing loaded before authentication.
3. `Add to Vault` displayed the personal-action authentication gate.
4. The continuation screen named `add to Vault` and promised return to the same card.
5. Authentication replaced the signed-out application root.
6. The authenticated shell resolved the same canonical GV-ID.
7. The exact card reopened and the pending Add action executed once.
8. The product displayed `In your vault` and `View your copy` for the exact printing.
9. The one disposable copy was removed through the product UI.
10. The exact card returned to `Add to Vault`, and the dedicated account was signed out.

## Implementation

- `PendingPersonalCardActionCoordinator` retains one explicit, in-memory card action across the root swap.
- Requests are consumed only by a matching `card_print_id` or normalized GV-ID.
- Canceling an older request cannot clear a newer request.
- Want continuation means ensure-wanted and cannot toggle an already wanted card off.
- The application promotes the pending action into an exact canonical card request after valid authentication.
- The navigator removes stale public and sign-in routes after the authenticated root is available.
- Web Google OAuth omits the native custom-scheme redirect and therefore uses the configured web origin.

## Evidence

- `01_direct_card_signed_out.png` and `.xml`: signed-out exact-card route.
- `02_add_to_vault_auth_gate.xml`: action-specific sign-in boundary.
- `03_named_sign_in_continuation.xml`: named destination and return promise.
- `04_post_auth_exact_card_action_completed.png` and `.xml`: same exact card with the action completed.

## Safety And Reconciliation

- The locked personal package `com.grookai.vault.lockedacceptance` was not changed.
- The side-by-side package `com.grookai.vault` used a dedicated release test account.
- No credential, email, token, or device serial is stored in this audit.
- One disposable exact copy was created and one was removed. Net test mutation is zero.
- The test account was signed out after cleanup.

## Verification

- Physical Samsung root-swap journey: passed.
- Full repository `npm run shipcheck`: passed.
- Flutter tests: `577/577` passed.
- Flutter analyzer: passed.
- Node contracts and production-backed runtime preflight: passed.
- Strict web typecheck, lint, and production build: passed.
- Diff checks: passed.

## Exact Next Gate

Push the frozen repair commit, satisfy and resolve the three pull-request review threads, merge through branch policy, verify the exact production deployment SHA, then cut cross-platform release candidates for the remaining final-candidate journeys and operations/distribution evidence.
