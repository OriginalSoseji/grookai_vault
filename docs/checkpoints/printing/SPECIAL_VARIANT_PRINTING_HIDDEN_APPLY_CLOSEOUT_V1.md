# Special Variant Printing Hidden Apply Closeout V1

## Context

The authority pass over `563` reference-only special-variant gaps produced `143` candidates backed by exact active TCGCSV/TCGplayer catalog identity, explicit variant naming, exact finish evidence, verified canonical consistency, and clean collision checks. The remaining `420` candidates did not meet that authority standard and stayed blocked.

PR `#176` merged the bounded apply mechanism and production search/display repair at SHA `7817209cd164513e3a9277caae6b1ec4b75c3a81`. PR `#177` merged the pricing quarantine, health monitor, and operational queues at SHA `5e48bead73ace5f025c09e840da249f06df5c40c`.

## Problem

The `143` proven child printings needed to become durable without becoming approved, public, or independently priceable before exact image and human review. A pre-migration audit also found that parent-level TCGplayer mappings allowed `9` hidden-child qualification candidates to resolve through the pricing read model even though no hidden child had yet produced an eligible decision, historical snapshot, or current price.

## Risk

An unsafe apply could overwrite parent identity, expose unreviewed variants, copy parent pricing authority to a child, manufacture exact imagery, or broaden the `420` unresolved candidates. A pricing repair that deleted rows or rewrote source mappings would also destroy evidence rather than enforce the publication boundary.

## Decision

Apply only the frozen `143`-row manifest. Each child is paired atomically with a `quarantined_candidate` review sidecar and `hidden_pending_review` visibility. Approval, public visibility, external child mapping, pricing publication, and canonical parent mutation remain separate gates.

The pricing boundary is enforced in governed read models. Hidden `hidden_pending_review` and `hidden_unsupported` child printings cannot qualify as exact market children and cannot appear in the current-price view. Historical evidence and source mappings are preserved.

## Alternatives Rejected

- Automatic approval was rejected because catalog authority does not replace image-confirmed human review.
- Public visibility on insert was rejected because these are quarantined candidates.
- Inheriting parent pricing mappings was rejected because a parent product is not child-printing price authority.
- Deleting the `9` parent mapping paths was rejected because the source evidence is valid for its governed parent and must remain auditable.
- Broadening or applying the remaining `420` rows was rejected because they lack the required authority chain.
- Treating representative artwork as proof of a stamp, border, finish, or print marker was rejected.

## Hidden Apply Proof

The real apply was split into six bounded GitHub Actions runs:

- `30949811535`: first `25`
- `30949971750`: remaining `118`, executed as five bounded batches of `25`, `25`, `25`, `25`, and `18`
- `30950141182`: full `143`-row reconciliation

Production readback proved:

- selected candidates: `143`
- durable child printings: `143`
- exact hidden review sidecars: `143`
- approved rows: `0`
- public printing-option leaks: `0`
- external child printing mappings: `0`
- canonical parent changes: `0`
- reconciliation mismatches: `0`

## Migration Applied

Migration `20260804220000_tcgplayer_market_printing_truth_quarantine_v1.sql` was applied to production from frozen SHA `5e48bead73ace5f025c09e840da249f06df5c40c`.

- dry-run workflow: `30953545635`
- dry-run result: exactly one pending migration, `20260804220000`
- apply workflow: `30953639769`
- apply result: success
- data-row writes: none; the migration replaced governed pricing read models only

The post-migration health workflow `30953728952` proved:

- target count: `143`
- exact child count: `143`
- exact hidden review count: `143`
- public printing-option leaks: `0`
- external child mappings: `0`
- hidden-child qualification candidates: `0`, reduced from `9`
- eligible price decisions: `0`
- historical snapshots: `0`
- current prices: `0`
- pricing boundary safe: `true`

## Current Truths

- `card_prints` remains canonical parent identity.
- `card_printings` contains `143` durable special-variant child candidates from the frozen authoritative manifest.
- All `143` remain unapproved and hidden pending human review.
- The `420` blocked authority rows remain untouched.
- Parent TCGplayer mappings remain parent evidence and cannot publish a hidden child price.
- No exact variant image is inferred from representative artwork.
- Web and Samsung exact-variant search smoke evidence passed without exposing hidden candidates as public printing options.
- The production health monitor is scheduled daily and is read-only.

## Operational Queues

- human review queue: `143`
- source and identity acquisition queue: `2,886`
- exact image acquisition queue: `3,295`
- hidden candidates needing exact image acquisition: `142` of `143`

These queues are operational inputs, not publication authority.

## Invariants

- Never promote discovery-only evidence into printing identity.
- Never approve or expose a hidden child without a separate governed human decision.
- Never copy a parent product mapping or price to a child printing.
- Never mutate canonical parent identity to make a child fit.
- Never treat `not observed` as `not present`.
- Never infer variant-specific stamps, text, borders, errors, colors, or finishes from shared artwork.
- Never broaden the `420` blocked rows without new authoritative evidence.
- Never allow hidden candidates into public printing options or current pricing.

## Verification

- focused special-variant and pricing contracts: `47/47` passed
- complete repository contract suite: `1,351` passed, `0` failed
- release secret packaging guard: passed
- `git diff --check`: passed
- PR `#177` GitHub checks, including CodeQL and database drift gates: passed
- production migration dry-run/apply: passed
- post-migration production health: passed
- Samsung exact-variant search smoke: passed

## Artifacts

- `docs/audits/special_variant_printing_authority_v1/bounded_apply_runs/`
- `docs/audits/special_variant_printing_authority_v1/closeout_runs/`
- `docs/audits/special_variant_printing_authority_v1/production_smoke/samsung_exact_variant_search_results.png`
- `docs/audits/special_variant_printing_authority_v1/special_variant_printing_pricing_boundary_pre_migration_v1.json`
- `docs/audits/special_variant_printing_operations_v1/special_variant_printing_human_review_queue_v1.json`
- `docs/audits/special_variant_printing_operations_v1/special_variant_printing_source_acquisition_queue_v1.json`
- `docs/audits/special_variant_printing_operations_v1/special_variant_printing_exact_image_queue_v1.json`

## What Must Never Be Broken

The `143` rows are durable candidates, not approved truth. Their existence must never be used as permission to publish them, price them through a parent mapping, or claim print-specific visual evidence that has not been observed. The `420` blocked rows remain blocked until their own evidence chain is complete.

## Explicit Next Gate

Human reviewers inspect the `143`-row queue against exact printing evidence. Each decision must preserve reviewer identity, source provenance, image hash where available, exact role/finish evidence, and an immutable audit record. Only separately confirmed rows may enter a future bounded approval/publication workflow. Source acquisition and exact-image acquisition can proceed in parallel, but neither automatically approves a row.

