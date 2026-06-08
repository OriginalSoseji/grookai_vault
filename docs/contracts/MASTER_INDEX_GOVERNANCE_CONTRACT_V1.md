# MASTER_INDEX_GOVERNANCE_CONTRACT_V1

Status: Active
Date: 2026-06-08

## Purpose

`MASTER_INDEX_GOVERNANCE_CONTRACT_V1` governs how the English Master Index is maintained after initial completion.

This contract defines how future sets enter the index, how drift is detected, and how evidence is promoted, suppressed, or adjudicated.

It does not authorize Grookai DB writes.

## Authority

This contract governs Master Index maintenance workflow.

It works with:

- `VERIFIED_MASTER_SET_INDEX_V1` for source agreement and evidence standards
- `ENGLISH_MASTER_INDEX_COMPLETION_V1` for completion and publishability gates
- `PRINTING_TRUTH_CONTRACT_V1` for fail-closed printing truth

If this contract conflicts with a stricter no-write, evidence, or printing-truth rule, the stricter rule wins.

## Scope

In scope:

- English physical Pokemon TCG Master Index maintenance
- future set intake
- monthly drift detection
- source preservation
- promotion workflow
- suppression workflow
- adjudication workflow
- completion and publishable export regeneration

Out of scope:

- DB writes
- migrations
- Grookai canonical mutation
- cleanup
- quarantine apply
- public hiding
- pricing
- scanner behavior
- vault ownership
- non-English cards
- Pokemon TCG Pocket unless separately governed

## Core Laws

### Master Index First

The Master Index is the reference target.

Grookai DB comparison or repair must not run against an incomplete Master Index set unless the output is explicitly labeled incomplete and read-only.

### Audit-Only By Default

All Master Index maintenance is audit-only unless a separate approved write contract and apply plan exists.

Forbidden inside Master Index maintenance:

- `INSERT`
- `UPDATE`
- `DELETE`
- migrations
- quarantine apply
- cleanup runners
- public visibility mutation
- canonical DB normalization

### No Source Reset

A rebuild may add source evidence, suppress invalid evidence, or adjudicate invalid facts.

A rebuild must not silently remove previously preserved evidence because a live source is unavailable, renamed, rate-limited, blocked, or aliased differently.

### No Heuristic Finish Truth

No printing or finish may be created from:

- era assumptions
- rarity assumptions
- set-wide reverse holo guesses
- product assumptions
- API-only finish agreement
- marketplace title ambiguity
- general parallel discussion without exact card-level mapping

## Future Set Intake

A future English set may enter the Master Index only through the intake workflow.

Required intake steps:

1. Create or update set configuration with canonical `set_key`, English set name, source aliases, and source availability expectations.
2. Collect structured source evidence where available.
3. Collect at least one human-readable, official, marketplace-checklist, or collector-reference source for finish truth.
4. Preserve all evidence with source key, source kind, source URL or stable source identifier, retrieval time, and raw snapshot reference.
5. Build source agreement report.
6. Classify card identities and printings.
7. Generate completion matrix.
8. Publish only when the set reaches `complete_master_index_set`.

Required future-set statuses:

- `source_unavailable`
- `source_limited`
- `source_agreed_card_identity`
- `card_identity_complete_finish_incomplete`
- `manual_review_required`
- `conflict_blocked`
- `complete_master_index_set`
- `non_standard_single_source_reference`

Future sets may exist as incomplete working evidence, but they must not be presented as complete public Master Index sets until the completion gate passes.

## Monthly Drift Detection

Run a monthly Master Index drift pass.

The drift pass must:

- rebuild source availability
- union live source rows with preserved snapshots
- compare source counts against the last healthy checkpoint
- detect alias remaps and dropped aliases
- detect newly added external source rows
- detect disappeared live rows without deleting preserved evidence
- detect newly conflicting finish claims
- detect structured-only finish claims unsupported by exact checklist evidence
- regenerate publishable manifest and completion matrix
- write a checkpoint if the build is non-degraded

Minimum drift invariants:

```text
master_admissible_card_identity_facts must not decrease without explicit adjudication
master_admissible_printing_facts must not decrease without explicit adjudication
conflicts must remain 0 or be reported as conflict_blocked
source gap queue must not increase silently
candidate_unconfirmed must not become truth
write_ready_now must remain 0 unless a separate write plan is approved
```

If a drift pass fails any invariant, stop and preserve the failed build as a review artifact. Do not promote it.

## Promotion Workflow

Promotion means moving a working evidence fact into Master Index admissible truth.

Promotion is allowed only when:

```text
source_count >= 2
AND independent sources agree on the exact fact
AND finish facts include at least one human-readable, official, marketplace-checklist, or collector-reference source
AND set + card_number + card_name + finish_key match exactly for printings
AND no unresolved conflict exists
AND the fact is English physical Pokemon TCG scope
```

Promotion workflow:

1. Add or collect evidence through a source adapter or fixture.
2. Run source-delta audit.
3. Accept only useful exact deltas into an accepted fixture.
4. Build guarded staging.
5. Run non-regression guard floors.
6. Promote reports only if non-degraded.
7. Regenerate completion, publishable, source-exhaustion, action-plan, and write-readiness reports.
8. Create a checkpoint.

Promotion must never come from "close enough" matching.

## Suppression Workflow

Suppression means a claim is excluded from working Master Index truth while retained as audit evidence.

Suppression is required when:

- a single structured source claims a finish not supported by exact checklist evidence for that card
- an API-only finish claim conflicts with human/checklist variant coverage
- a source claim is too ambiguous to use safely
- a marketplace/product title lacks exact set + number + name + finish proof

Suppression output must include:

- suppressed fact
- source key
- source kind
- source URL or stable identifier
- supported checklist finishes for the same card, when available
- suppression reason
- suppression timestamp

Suppression is not deletion authority for Grookai.

## Adjudication Workflow

Adjudication means a reviewed fact receives a deterministic non-promotion outcome.

Adjudication is required when source acquisition is exhausted or reviewed evidence points to a different truth.

Allowed adjudication outcomes:

- `finish_label_conflict`
- `card_number_conflict`
- `source_exhausted_no_exact_match`
- `non_standard_reference_lane`
- `wrong_set_or_alias`
- `conflicting_sources`
- `needs_physical_review`

Adjudicated exclusions must be removed from the Master Index working completion denominator only when evidence shows they are not valid working truth for the claimed fact.

Adjudicated exclusions must remain preserved in an audit artifact with:

- set key
- set name
- card number
- card name
- claimed finish
- blocker type
- source URLs
- evidence labels
- reason not promoted
- next action

Adjudication is not deletion authority for Grookai.

## Source Preservation Workflow

Preserved source evidence is required for all source families that are volatile, rate-limited, unavailable, alias-shifting, or partially manual.

Preservation records must retain:

- `source_key`
- `source_kind`
- `source_url` or stable source identifier
- `set_key`
- source alias used at collection time
- card number
- card name
- finish key, if applicable
- evidence type
- evidence label
- retrieval timestamp
- raw snapshot reference

Live source rows may add evidence. They must not erase preserved evidence.

## Publishable Export Rules

Only `complete_master_index_set` standard sets may enter the publishable complete set export.

Non-standard reference lanes may be included in internal reports only when clearly labeled.

The publishable manifest must report:

- total sets
- publishable complete sets
- non-publishable or non-standard lanes
- card facts
- printing facts
- per-set shard references

## Checkpoint Requirements

Create a checkpoint when any of the following changes:

- new set becomes publishable-complete
- source adapter changes evidence semantics
- source preservation behavior changes
- suppression count materially changes
- adjudication changes completion denominator
- monthly drift pass establishes a new healthy baseline
- publishable manifest changes set count or fact counts

Checkpoint must include:

- previous baseline
- new baseline
- commands run
- non-regression guard result
- source changes
- suppression/adjudication changes
- no-write safety confirmation

## Stop Rules

Stop immediately if:

- a DB write path is imported or executed
- a migration is created
- an apply runner is called
- a source reset drops preserved evidence
- API-only finish facts become master truth
- exact finish truth is inferred from a general rule
- conflicts appear
- source gap queue increases without explanation
- publishable count changes without checkpoint
- non-English or Pocket scope enters the English physical index

## Required Outputs

Normal governance runs must produce or refresh:

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/`
- `docs/audits/english_master_index_completion_v1/`
- `docs/audits/english_master_index_publishable_v1/`
- `docs/audits/english_master_index_source_exhaustion_v1/`
- `docs/checkpoints/master_index/`

## Success Definition

Master Index governance is working when:

- future sets enter as incomplete until proven
- monthly drift is detectable and reversible
- source volatility cannot erase preserved truth
- exact evidence is promoted only through guarded staging
- unsupported claims are suppressed with evidence
- blocker facts are adjudicated with reasons
- complete standard sets remain publishable with confidence
- DB writes remain outside the Master Index maintenance workflow
