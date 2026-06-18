# Image Truth Display Coverage And Exact Variant Handoff V1

## Summary

Date: 2026-06-18

English physical card display coverage is closed, but exact variant image coverage is not complete.

The current safe product contract is:

> Correct printing; representative image may not show exact finish, stamp, or parallel.

This checkpoint exists so future web, web app, and mobile work does not confuse display coverage with exact visual truth.

## What Changed

- IMG-18B applied representative display coverage for the remaining MEP Pokemon Center stamped holo rows.
- The English physical image audit now reports `english_physical_missing_display_rows: 0`.
- The exact-variant backlog reports were refreshed after display closure.
- The residual PriceCharting exact-image probe was rerun and did not produce any safe exact-image promotions.

## What Is Now True

- English physical child printings with display coverage: `37,646`.
- English physical missing display rows: `0`.
- English physical exact rows: `22,739`.
- English physical representative rows: `476`.
- Exact variant image backlog rows: `14,431`.
- Exact promote-ready rows now: `0`.
- PriceCharting residual exact probe candidates: `6`.
- PriceCharting residual exact-ready rows: `0`.
- PriceCharting residual blocked rows: `6`.

## Product Rule

Display coverage means the user should see an image.

Exact variant image truth means the image itself proves the exact child printing visual, including finish, stamp, parallel, or special variant.

Do not treat these as the same thing.

When a card_printing has a representative image, product surfaces should show a clear user-facing state equivalent to:

> This is the correct printing, but the image is representative and may not show the exact variant visual.

## Remaining Risks

- `14,431` rows still need exact variant imagery if Grookai wants complete visual truth.
- `12,340` rows are reverse-heavy and likely require a rendered-overlay strategy or new exact-photo source family.
- `1,636` rows currently have no preserved image-source evidence.
- Marketplace or listing-title evidence can prove existence but usually does not prove an exact reusable image asset.
- Listing images should not become canonical assets without a separate rights and exactness workflow.

## Next Likely Step

Build product UI support for image honesty:

- Show exact image confidence when `display_image_kind = exact`.
- Show representative/missing-variant messaging when `display_image_kind` is representative or missing exact variant visual.
- Keep card identity, finish, stamp, and printing truth visible even when the image is only representative.
- Do not hide verified child printings just because exact visual proof is missing.

After product honesty is clear, the next data lane should be either:

- a dedicated exact-photo acquisition workflow for high-value variants, or
- a clearly labeled rendered-overlay representative lane for reverse-heavy rows.

## Related Artifacts

- `docs/audits/image_truth_v1/image_truth_audit_v1.md`
- `docs/audits/image_truth_v1/image_truth_exact_variant_readiness_v1.md`
- `docs/audits/image_truth_v1/image_truth_source_exhaustion_decision_v1.md`
- `docs/audits/image_truth_v1/image_truth_img18b_mep_pokemon_center_stamp_representative_real_apply_result_v1.md`
- `docs/audits/image_truth_v1/image_truth_img14a_pricecharting_residual_exact_probe_v1.md`
- Commit `021b42bd` - `docs: refresh pricecharting exact image probe`
