# Card Visual Search Eligibility V1

Status: COMPLETE; OFFLINE TIER A/B/C POLICY RECONCILED

Date: 2026-07-21

## Context

Corpus V1 source inventory reconciled exactly `11,000` unique card-print IDs: `10,376` structurally valid candidates and `624` source gaps. Structural validity could not be used directly as search eligibility because it is separate from both human approval and retrieval safety.

## Decision

Lock and execute `CARD_VISUAL_SEARCH_ELIGIBILITY_V1` as an offline deterministic policy.

- Tier A: clean trusted retrieval evidence.
- Tier B: known noncritical uncertainty with explicit projection guard classes.
- Tier C: source gaps, critical subject/role/branch conflict, graph/hash failure, Energy, unsupported status, low identity/attribute confidence, or unknown policy class.

The policy does not mutate source graphs. Tier B guard keys are instructions for the future deterministic projection builder; they do not authorize indexing by themselves.

## Producing Version

- Eligibility implementation commit: `698417617ea5d120ee4f7e0c4a23b67518a15c1e`
- Contract hygiene commit and producing run commit: `ee1faa4ca4d3a4c0733ffaac6b929ce2e5364658`
- Policy version: `CARD_VISUAL_SEARCH_ELIGIBILITY_V1`
- Source inventory run: `3f72560c3b04`
- Source inventory candidates: `10,376`
- Source inventory gaps: `624`

## Eligibility Result

- Source decisions: `11,000`
- Tier A: `2,772`
- Tier B: `6,816`
- Tier C: `1,412`
- Search eligible: `9,588`
- Source-gap Tier C: `624`
- Valid-row Tier C: `788`
- Duplicate decision IDs: `0`
- Unknown quality flags: `0`
- Unknown policy rules: `0`
- Energy rows eligible: `0`
- Reconciliation findings: `0`

## Valid-Row Tier C Reasons

The `788` critical valid-row exclusions are the union of these flags; some rows have more than one:

- `potential_primary_subject_mismatch`: `480`
- `potential_subject_kind_classification_confusion`: `305`
- `potential_unavailable_metadata_prompt_branch_mismatch`: `49`

These rows retain their original structurally valid source graphs but produce no active search projection under V1.

## Source-Gap Tier C Reasons

- Quarantine: `302`
- Image skip: `49`
- Unprocessed: `273`

Source gaps remain explicit. They are not represented as cards with empty artwork.

## Tier B Projection Guards

Guard occurrence counts across Tier B decisions:

- `module_completeness`: `5,001`
- `counts`: `1,810`
- `environment_setting`: `1,014`
- `pose_action_state`: `615`
- `metadata_terms`: `334`
- `print_markers`: `327`
- `image_or_text_visibility`: `221`
- `weather_time`: `127`
- `material_surface`: `89`
- `anatomy`: `74`
- `subject_semantics`: `59`
- `expression_personality_mood`: `41`
- `card_ui_terms`: `11`
- `search_term_fallback`: `6`

Guard counts overlap because one decision may carry multiple known limitations.

## Branch Distribution

All source outcomes by branch and tier:

- Pokemon: `2,641 A`, `5,748 B`, `1,286 C`
- Trainer: `64 A`, `694 B`, `102 C`
- Item/Tool/Supporter: `64 A`, `287 B`, `21 C`
- Stadium: `3 A`, `87 B`, `3 C`
- Energy: `0`

## Artifact Verification

Audit directory:

`docs/audits/card_visual_search_eligibility_v1/2026-07-21T15-59-27-069Z_eligibility_bf56850e0cb0`

Verified outputs:

- `eligibility_decisions.jsonl`: `11,000`
- `tier_a_decisions.jsonl`: `2,772`
- `tier_b_decisions.jsonl`: `6,816`
- `tier_c_decisions.jsonl`: `1,412`
- `ELIGIBILITY_RECONCILIATION.json`
- `ELIGIBILITY_RECONCILIATION.md`
- `run_plan.json`
- `artifact_hashes.json`: `7/7` files verified; `0` bad hashes

## Tests

- Eligibility and inventory targeted contracts: `15/15` passed.
- Eligibility and wrapper syntax checks: passed.
- `git diff --check`: passed after contract file hygiene.
- Full repository shipcheck: not run because `SUPABASE_DB_URL` is unavailable in this shell.

## Boundaries

- Provider calls: `0`
- Live database connections: `0`
- Database writes: `0`
- Approvals: `0`
- Embeddings: `0`
- Artwork groups assigned: `0`
- Projection documents built: `0`
- Search index writes: `0`
- Public reads: `0`

## Current Truths

- `9,588` source rows are eligible for future deterministic visual-search projections.
- Tier A contains exactly the `2,772` clean `pending` rows with no policy limitations.
- Tier B contains only known noncritical classes and preserves exact guard evidence.
- Every unknown quality flag or policy rule fails closed; none occurred in this corpus.
- Tier C preserves both source gaps and critical valid-row exclusions without deleting source evidence.
- Eligibility is not approval, artwork grouping, projection, embedding, or activation.

## Invariants

- Never index Tier C.
- Never project a Tier B guarded claim class without applying its guard.
- Never change source graphs to improve eligibility counts.
- Never turn a new unknown flag into Tier B without a policy version and tests.
- Never let shared artwork authorize printing-specific markers.
- Never use price, popularity, ownership, or collector taste to decide evidence eligibility.

## Exact Next Gate

Create a deterministic stratified audit sample covering Tier A, every Tier B projection guard, every valid-row Tier C critical reason, all source-gap types, and all four included branches. The audit must verify policy classification and source evidence without approving descriptions. If the audit passes, freeze eligibility and begin a separate fail-closed artwork-grouping contract and implementation. Do not build projections, embeddings, database indexes, or public search before that audit.
