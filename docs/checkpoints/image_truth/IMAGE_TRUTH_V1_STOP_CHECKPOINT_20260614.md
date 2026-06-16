# Image Truth V1 Stop Checkpoint

Date: 2026-06-14

This checkpoint records where Image Truth V1 stopped and how to resume safely.

## Current State

English physical canon reconciliation is complete. Image Truth V1 is now focused on child-printing image truth for `card_printings`, not parent image overwrites.

The current safe product state is:

```text
Correct printing; representative image may not show exact finish, stamp, or parallel.
```

That is intentional. Representative images are acceptable only when the UI stays honest about exact finish, stamp, or parallel uncertainty.

## Safety Boundary

Future work must preserve these rules:

- English physical only.
- Target child `card_printings`.
- No parent image overwrites.
- No DB writes without a fresh dry-run proof and explicit approval.
- No storage promotion without proof.
- No migrations unless explicitly requested for a separate schema task.
- Source URL must be preserved.
- Image confidence must be `exact` or `representative`, never guessed.
- Variant existence evidence is not image exactness evidence.
- eBay Browse listing titles may be evidence context only; do not use listing images as canonical assets without a separately approved licensing/exactness rule.

## Completed Image Work

Display coverage/honesty work has already begun:

- Website/app image presentation has representative-image honesty copy.
- Missing-display packages were applied for known representative sources.
- PriceCharting exact variant packages were applied only where frozen exact proof existed.
- CardTrader exact variant package was applied only where frozen exact proof existed.
- MEP finish correction was applied for four rows from `holo` to `cosmos`, then representative MEP image gaps were closed.

Do not re-apply prior packages.

## Latest Reports

Primary restart files:

- `docs/audits/image_truth_v1/image_truth_source_exhaustion_decision_v1.md`
- `docs/audits/image_truth_v1/image_truth_img16a_exact_photo_acquisition_plan_v1.md`
- `docs/audits/image_truth_v1/image_truth_img16b_exact_photo_source_evidence_pilot_v1.md`
- `docs/audits/image_truth_v1/image_truth_exact_variant_readiness_v1.md`
- `docs/audits/image_truth_v1/image_truth_exact_variant_source_lanes_v1.md`

Latest source-exhaustion state:

```text
exact_variant_backlog_rows: 13,831
exact_promote_ready_rows_now: 0
pricecharting_residual_exact_ready_rows: 0
ebay_title_evidence_candidate_rows: 3
exact_photo_source_evidence_rows: 377
exact_photo_high_value_no_source_rows: 359
exact_photo_source_evidence_pilot_rows: 25
exact_photo_source_evidence_pilot_ready_rows: 0
representative_or_blocked_rows: 13,825
no_source_evidence_rows: 1,307
```

IMG-16B tested the first 25 exact-photo source-evidence rows. Result:

```text
source_rows: 25
exact_ready_rows: 0
blocked_rows: 25
reason: source_proves_variant_but_image_urls_are_card_level_or_unproven
```

Meaning: TCGCollector/BinderBuilder-style pages can prove the variant exists, but their discovered image assets are not proven exact variant photos.

## What Not To Do Next

Do not:

- Promote TCGCollector page images as exact variant assets.
- Promote BinderBuilder/Scrydex card-level images as exact variant assets.
- Treat TCGCollector/BinderBuilder variant labels as image exactness.
- Use eBay listing images as canonical assets.
- Bulk-mark reverse/cosmos/cracked_ice/stamped rows exact without asset-level proof.
- Restart from Master Index reconciliation. That phase is complete.

## Resume Plan

Start with a read-only sanity pass:

```powershell
node --check scripts\audits\image_truth_v1_source_exhaustion_decision.mjs
node --check scripts\audits\image_truth_v1_img16a_exact_photo_acquisition_plan.mjs
node --check scripts\audits\image_truth_v1_img16b_exact_photo_source_evidence_pilot.mjs
node scripts\audits\image_truth_v1_source_exhaustion_decision.mjs
```

Then choose one of these paths:

1. New exact-photo source hunt.
   - Target the 377 `exact_photo_needed_source_evidence_exists` rows first.
   - Look for sources whose image asset itself proves exact finish/variant.
   - Create a new evidence-only probe before any upload plan.

2. No-source high-value source acquisition.
   - Target 359 high-value no-source rows: `pokeball`, `masterball`, `rocket_reverse`, `cosmos`, `cracked_ice`.
   - First goal is source evidence, not image upload.

3. Reverse-heavy representative overlay design.
   - Target the 12,074 reverse-heavy representative rows.
   - Any generated/rendered overlay must be labeled representative, not exact.

4. Manual visual review lane.
   - Target the 56 TCGCSV/TCGplayer catalog rows.
   - Only promote if visual proof shows the exact finish.

## Next Recommended Task

Recommended next task when resuming:

```text
Build IMG-17A as an audit-only new-source exact-photo discovery probe.

Scope:
- English physical only
- child card_printings only
- no DB writes
- no storage uploads
- no migrations
- no parent overwrites
- preserve source URL
- report exact asset candidates separately from representative-only sources

Input:
- image_truth_img16a_exact_photo_acquisition_plan_v1.json
- image_truth_source_exhaustion_decision_v1.json

Goal:
- Find a source family that provides exact child-printing photos for cosmos/cracked_ice/pokeball/masterball/rocket_reverse/stamped rows.
- If none found, produce a source-exhaustion report and keep representative honesty.
```

## Verification Commands

Run before ending any future Image Truth work:

```powershell
node --test tests\contracts\contract_scope_v1.test.mjs
git diff --check
git status --short -- supabase\migrations
npm run preflight
```

Expected known preflight state at this checkpoint:

```text
status: PASS_WITH_DEFERRED_DEBT
critical_fail_checks: 0
known deferred debt includes:
- card_prints_missing_gv_id: 4857
- external_mappings_source_card_duplicates: 194
- identity_active_missing_for_canonical_card_print: 16624
```

## Final Principle

The image system should be useful without being deceptive.

If Grookai cannot prove the exact variant image, it should still show the correct printing with representative-image disclosure instead of pretending the visual is exact.
