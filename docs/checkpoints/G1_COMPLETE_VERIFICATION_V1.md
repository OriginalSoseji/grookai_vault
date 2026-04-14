# G1_COMPLETE_VERIFICATION_V1

Status: Failed
Type: Final Verification Checkpoint
Scope: `g1`
Date: 2026-04-12

## Context
`g1` was decomposed into two deterministic execution lanes and both execution units completed:

- `BASE_VARIANT_COLLAPSE -> COMPLETE (13)`
- `RC_PREFIX_EXACT_TOKEN_PROMOTION -> COMPLETE (16)`

This checkpoint is the final read-only closure audit after both execution phases.

## Verification Results
- `unresolved_count = 0`
- `duplicate_parent_count = 0`
- `active_identity_violations = 0`
- `card_print_identity_orphans = 0`
- `card_print_traits_orphans = 0`
- `card_printings_orphans = 0`
- `external_mappings_orphans = 0`
- `vault_items_orphans = 0`
- `normalization_drift_count = 6`
- `token_consistency_violations = 0`
- `canonical_count = 116`
- `rc_prefix_validation_count = 16`
- `rc_prefix_validation_mismatch_count = 0`

## RC Prefix Validation
The exact 16-row RC promotion surface validated cleanly:

- all `16` audited RC `gv_id` values exist
- every row preserves `number = RC##`
- every row preserves `number_plain = <numeric portion only>`
- every row preserves `variant_key = 'rc'`
- no RC promotion mismatches were found

## Invariants Confirmed
- no unresolved `g1` parents remain
- no duplicate canonical rows exist under `(number_plain, variant_key)`
- every canonical `g1` parent has at most one active identity row
- no FK orphans exist on any checked dependent table
- the RC-prefix identity lane is modeled lawfully and deterministically

## Risks Checked
- accidental RC namespace collision: none detected
- incorrect `number` / `number_plain` split on the RC lane: none detected
- orphaned dependent rows: none detected
- hidden duplicate identity surfaces: none detected

## Failing Condition
Final closure failed on residual canonical normalization drift.

Drift rows still present:

- `GV-PK-GEN-1 / Venusaur EX / 1`
- `GV-PK-GEN-10 / Leafeon EX / 10`
- `GV-PK-GEN-11 / Charizard EX / 11`
- `GV-PK-GEN-24 / Vaporeon EX / 24`
- `GV-PK-GEN-28 / Jolteon EX / 28`
- `GV-PK-GEN-RC30 / Gardevoir EX / RC30`

These rows still violate `NAME_NORMALIZE_V3` because `EX` has not been normalized to `-EX`.

## Final State
`g1` is not yet formally closed.

Identity resolution is complete and deterministic, but canonical-name normalization is not yet fully clean. The next lawful step is a bounded post-normalization drift repair for the six canonical rows listed above, followed by a re-run of final verification.
