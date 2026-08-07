# Android Exact-Printing Message Journey - 2026-08-06

## Decision

Status: `PASSED`

The Samsung pre-candidate build created a real card-centered message from an exact available copy. Production readback proves the interaction retained the selected child printing and created two exact participant-state rows. Existing legacy conversations remained explicitly unassigned rather than receiving an inferred finish.

This evidence closes the exact-printing repair gate. It contributes to Journeys C and D, but it does not replace the final immutable-candidate device suite or the 72-hour soak.

## Provenance

- App source commit: `89d2f69921380de1b4876f5013c79fdffc5c5831`
- Repair commit: `7b0bbf4fdc7e3afd18a0a931a23bbd7c287d60f7`
- Device: Samsung `SM-S908U`, Android 16
- Package: `com.grookai.vault`
- Installed version: `1.0.0` (`versionCode=21`)
- Build mode: debug diagnostic with governed production public configuration
- Production migration: `20260806220000_card_interactions_exact_printing_v1`

## Journey Result

1. Discover exposed an available exact card owned by another collector.
2. The contact action opened a card-centered message composer.
3. Sending created interaction `10ea4f9b-1332-4892-be20-efabfca460ff`.
4. The Sent surface showed `Piplup - Build A Bear Workshop Stamp`, `Ultra Prism #32`, and `Printing: Normal`.
5. Production readback proved parent `GV-PK-UPR-32-BUILD-A-BEAR-WORKSHOP-STAMP`, child `GV-PK-UPR-32-BUILD-A-BEAR-WORKSHOP-STAMP-STD`, and finish `normal`.
6. Two participant state rows retained the same parent and child identity.
7. Existing parent-only conversations continued to show `Printing not recorded`.

## Boundaries

- No historical row was backfilled.
- No missing legacy finish was inferred.
- No canonical, vault, or pricing row was changed by the readback.
- User identifiers are excluded from permanent evidence.
- The release-test message is plainly marked `Release_test_exact_printing_no_action_needed`.

## Evidence

- `exact_printing_message_journey_readback_v1.json`
- `exact_printing_message_sent.png`
- `exact_printing_sent_inbox.png`
- `legacy_and_exact_printing_boundaries.png`
- `../card_interactions_exact_printing_production_rls_smoke_v1.json`
- `../card_interactions_exact_printing_production_readback_v1.json`

## Remaining Release Gate

Repeat the complete A-F journey suite from the immutable final Android and iOS candidates. This pre-candidate evidence must not be relabeled as final-candidate or soak proof.
