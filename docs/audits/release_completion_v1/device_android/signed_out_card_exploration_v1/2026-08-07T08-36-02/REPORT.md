# Signed-Out Mobile Card Exploration Android Proof V1

## Decision

Status: `PASS_WITH_EXTERNAL_RELEASE_GATES`

The Samsung Galaxy S22 Ultra proof establishes that a signed-out collector can enter the public catalog, inspect an exact card, reach authentication only when starting a personal action, return to the same card, and complete the pending action. The result is bound to source commit `ff45bc07c7518daf369970bc7834aacfb2b4849f` on `release/final-journey-proof-v1`.

This is complete for the Android debug-device scope. It does not complete the physical-iPhone/TestFlight or final-candidate soak gates.

## Proven Journey

1. The signed-out entry displayed `Explore cards` without requiring an account.
2. The public catalog loaded 32 cards and rendered 24 in the initial viewport-backed result set.
3. Card tiles showed card, set, number, finish, and hosted artwork without personalized pricing or ownership reads.
4. A signed-out collector opened an exact card detail.
5. `Add to Vault` was the first authentication boundary.
6. The continuation screen named the pending action and promised a return to the same card.
7. Email authentication succeeded for a dedicated release account and resumed the pending action.
8. The exact Normal printing opened as one owned copy.
9. The disposable copy was removed through the product UI; net test-copy count returned to zero.
10. The public catalog changed its account action to `Continue`, which returned to the authenticated Pulse shell.
11. After signing out again, `grookaivault://card/GV-PK-MEW-025` cold-opened the exact Pikachu 151 #025 card.
12. The repaired personal-action sheet cleared the Samsung system navigation area.

## Exact Card

- GV-ID: `GV-PK-MEW-025`
- Name: `Pikachu`
- Set: `151`
- Number: `025/165`
- Finish: `Normal`

## Safety Boundaries

- The locked personal package `com.grookai.vault.lockedacceptance` was not modified.
- Testing used the side-by-side package `com.grookai.vault`.
- The debug APK included only the public Supabase URL and publishable key from ignored local configuration.
- No backend secret was packaged or committed.
- No credential, token, email address, device serial, or private message is present in the committed evidence.
- The only product mutation was one disposable copy in a dedicated release account; the copy was removed before closeout.
- The original debug-package data backup remains outside the repository and was not used as evidence.

## Defect And Repair

`04_personal_action_sign_in_gate.png` records the initial action sheet overlapping the Samsung navigation region. `CardDetailScreen` now includes bottom system view padding. `10_safe_area_personal_action_gate.png` is the authoritative post-repair proof and shows the complete sheet and buttons above system navigation.

## Verification

- Focused signed-out and quick-add contracts: `5/5` passed.
- Full Flutter suite: `574/574` passed.
- Full repository `npm run shipcheck`: passed.
- Production-backed runtime preflight: passed with only already-governed deferred debt.
- Strict web typecheck, lint, and build: passed.
- Flutter analyzer: passed.
- Diff checks: passed.

## Honest External Gaps

The custom native scheme is proven. Android verified HTTPS App Links cannot be claimed because the repository has no authoritative Play release certificate fingerprint and no matching `assetlinks.json`. The existing HTTPS card URL remains web-first. This is an external release-identity configuration gate, not a reason to fabricate signing authority.

Physical iPhone/TestFlight execution remains required. The existing Want Match supplemental artifact correctly records an Android device but is generated under an iPhone-specific policy, so its raw `failed` status reflects the unmet iPhone/TestFlight confirmations rather than an Android product failure.

## Exact Next Gate

Cut one immutable release candidate from the verified source, publish Android App Links with the authoritative release certificate, execute the same journey on the physical iPhone/TestFlight candidate, finish the remaining operations/distribution matrix, and only then begin the non-backdated 72-hour soak.
