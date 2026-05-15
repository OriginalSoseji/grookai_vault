# Scanner Full-Art Selection Identity Fix Report V1

Date: 2026-05-10

Branch: `scanner-v4-card-present-gate`

## Purpose

Record what happened during the two-card full-art scanner debugging session and document the scanner-only fix that made the live app correctly identify the selected cards.

## Starting Problem

Two cards were placed in frame:

- left: `Vanilluxe sv10.5w 113`
- right: `Vanillite sv10.5w 111`

The scanner could detect cards and draw selectable boxes, but identity was not production-ready for this full-art scene. The selected left card repeatedly locked to the wrong identity.

Observed failures:

- left Vanilluxe initially locked as `Frillish sv10.5w 126`
- after an identity scoring adjustment, left Vanilluxe locked as `Frosmoth me01 43`
- after an initial native identity expansion, the left-card test could drift into the right-card family and lock as `Vanillite sv10.5w 027`

This was not a database coverage issue for these cards. The hosted identity service already had the required `sv10.5w` references loaded.

## What Happened

The detector was finding two cards, but the selected-card identity crop was sometimes too low on the full-art Vanilluxe. The exported lock artifact showed the normalized card crop missing the name/title region and mostly containing lower artwork and attack text.

That made the identity pipeline overvalue visual matches from generic artwork and title-band-like embeddings. The left Vanilluxe crop contained enough snow/ice visual features to match nearby frost or water-themed cards, but not enough clean title/full-card structure to consistently choose the exact print.

The next issue was selection routing. The UI allowed tapping a card, but the live loop could still use a native detector candidate rather than a selected-card identity crop when the tap occurred before stable tracked quads were available. In a two-card scene, that made identity vulnerable to crossing into the adjacent right card.

## Root Cause

There were three scanner-side causes:

1. Full-art identity crops were too dependent on the detector's internal rectangle.

   For full-art cards, the strongest detected rectangle can be an internal visual region rather than the true full card. That crop is acceptable for card-present detection, but it is not always safe for print identity.

2. Cross-view title-band matches were counted too strongly.

   Non-title query crops could match `title_band` reference views and still receive normal multi-crop support. In this scene, that let visually similar wrong cards gain enough support to pass fast confidence.

3. Tap selection was not retained strongly enough during live tracking.

   When the user tapped a card before a stable quad was available, the tap could be lost instead of being applied to the nearest tracked card once quads arrived.

## Fix

The fix stayed scanner-only.

Implemented behavior changes:

- Added pending tap selection retention so a tap can be applied to the nearest detected card shortly after stable quads arrive.
- Made tap selection tolerant enough for real camera timing by choosing the nearest card within a bounded distance when the tap does not land exactly inside a current quad.
- Added selected-card identity expansion so the identity crop includes more of the real card, especially the top/title region, without changing detector thresholds.
- Added native identity expansion for non-selected native detector crops so full-art cards get a better identity crop than the detector's internal rectangle.
- Made selected-card identity prefer the selected expanded crop instead of falling back to the chopped native rectangle.
- Added identity scoring support for high-trust upper/full-card priority signals.
- Penalized cross-view title-band matches when a non-title query crop only matches a title-band reference.

Files involved in this fix:

- `lib/screens/scanner/condition_camera_screen.dart`
- `lib/services/scanner_v3/scanner_v3_live_loop_controller.dart`
- `lib/services/scanner_v3/scanner_v3_identity_pipeline_v8.dart`

Related identity service work already present in the branch:

- `backend/identity_v3/lib/scanner_v3_reference_views_v1.mjs`
- `backend/identity_v3/run_scanner_v3_identity_service_v1.mjs`

## Result

Final live-device verification passed with both cards in frame:

- left selected card locked as `Vanilluxe sv10.5w 113`
- right selected card locked as `Vanillite sv10.5w 111`

Evidence screenshots:

- `.tmp/scanner_after_selected_identity_expanded_left_wait.png`
- `.tmp/scanner_after_selected_identity_expanded_right_test.png`

## Verification

Commands run:

- `git diff --check`
- `flutter analyze lib/screens/scanner lib/services/scanner lib/services/scanner_v3 lib/services/scanner_v4 --no-pub`
- `node --check backend/scanner_v4/parse_real_device_auto_test_report_v1.mjs`

All passed.

## Boundary Notes

No detector thresholds, OCR authority, retrieval model, ML model, pricing, Supabase writes, or backend identity workers were changed for this fix.

The fix improves selected-card behavior and identity crop quality for difficult full-art cards. It does not claim complete production coverage for every full-art print. The next production step should be a broader live-card regression set with multiple full-art, holo, regular, and close-neighbor cards in two-card and single-card scenes.
