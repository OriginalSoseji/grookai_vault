# G1_POST_NORMALIZATION_DRIFT_REPAIR_DEBUG_AUDIT_V1

Status: Passed
Type: Debug Audit
Scope: `g1`
Date: 2026-04-12

## Context
- final `g1` verification failed on `normalization_drift_count = 6`
- identity resolution itself is complete:
  - unresolved rows = `0`
  - duplicate canonical rows = `0`
  - RC-prefix promotion lane validated cleanly
- the remaining failure is canonical-name punctuation drift only

## Exact Drift Rows
- `095e74cb-e9fd-46c8-8ffb-15f165195672 / Venusaur EX / GV-PK-GEN-1`
- `dddd1e45-be0c-4c57-95c8-4538d224f98e / Leafeon EX / GV-PK-GEN-10`
- `2b0e08a7-d030-452d-bd69-2f4ead71f7d2 / Charizard EX / GV-PK-GEN-11`
- `e41576b3-63ad-4d3f-b54b-74659ee56475 / Vaporeon EX / GV-PK-GEN-24`
- `ff741f35-d525-4725-bb8e-9878d2a12856 / Jolteon EX / GV-PK-GEN-28`
- `8498f4ed-a36c-5463-85d6-f4f697136385 / Gardevoir EX / GV-PK-GEN-RC30`

## Expected Normalized Output
- `Venusaur EX -> Venusaur-EX`
- `Leafeon EX -> Leafeon-EX`
- `Charizard EX -> Charizard-EX`
- `Vaporeon EX -> Vaporeon-EX`
- `Jolteon EX -> Jolteon-EX`
- `Gardevoir EX -> Gardevoir-EX`

## Failure Reasons
- all `6` rows classify as `EX_NOT_CONVERTED`
- `rules_required_count = 1` for every row
- `semantic_key_drift_count = 0`

This proves:
- the normalization expectation is uniform across all six rows
- the drift is display punctuation only
- there is no mixed-rule edge case
- there is no disagreement between detection and full `NAME_NORMALIZE_V3` semantics

## Root Cause
The failure is not a regex edge case inside the six live rows.

Repo audit result:
- there is no `g1`-specific post-normalization drift repair artifact in `backend/identity`
- there is no `g1`-specific post-normalization drift SQL or checkpoint in `docs/sql` or `docs/checkpoints`
- only `xy3`, `xy4`, and `xy6` have completed post-normalization drift repair artifacts

That means the live `g1` drift surface was never actually targeted by a bounded `g1` repair unit. The unchanged drift count is explained by an execution gap, not by a mismatch between the drift detector and the required normalization logic.

## Update Gap Analysis
Actual required transformation:
- terminal `EX` suffix must be converted to `-EX`
- no apostrophe normalization is needed
- no dash separator normalization is needed
- no whitespace collapse beyond the normal single-space surface is needed
- no multi-pass rule chain is required for these six rows

Comparison to the working repair pattern already present in repo:
- the `xy6_post_normalization_drift_repair_v2` code-level `NAME_NORMALIZE_V3` logic would normalize these six `g1` rows correctly
- the `g1` failure is therefore not due to incomplete terminal `EX` regex behavior
- the gap is that no equivalent `g1` repair artifact was created and applied

## Required Fix Strategy
Exact deterministic fix path:

- `C. code-level normalization instead of SQL replace`
- `D. normalization must run across ALL canonical g1 rows, updating only computed drift rows`

Reason:
- a one-off regex fix would work for the current six rows, but it would be weaker governance
- the repo already has a better proven pattern in `xy6_post_normalization_drift_repair_v2`
- running the full case-preserving `NAME_NORMALIZE_V3` computation across canonical `g1` rows and updating only rows where `proposed_name <> current_name` is deterministic, idempotent, and final

## Final Debug Conclusion
The exact cause of failure is now identified:

- live drift surface = `6` rows
- all six require the same single terminal `EX -> -EX` display normalization
- detection logic and expected normalization output are aligned
- the prior failure came from absence of a `g1`-targeted repair execution, not from ambiguous normalization behavior
