# English Master Index Postmortem V1

Date: 2026-06-08

## Status

Institutional memory for the English Master Index completion pass.

This document is audit-only. It does not authorize database writes, migrations, cleanup, quarantine, insertion, deletion, public hiding, or Grookai reconciliation.

## Why It Was Needed

Grookai had canonical printing risk.

The catalog could contain:

- reverse holo rows that were not externally proven
- invented finish variants
- API-only assumptions promoted too far
- legacy ingestion rows that survived without source-backed printing proof
- Grookai DB rows that could not be compared against a complete independent reference

The original problem was not just one wrong set. The deeper problem was the absence of a governed English reference system that could say what should exist before Grookai tried to repair what does exist.

The Master Index was needed because Grookai cannot safely normalize, quarantine, insert, delete, or display completion truth against an incomplete target.

## What It Solved

The completed English Master Index now provides:

- a source-backed English physical Pokemon TCG set registry
- master-admissible card identity facts
- master-admissible printing and finish facts
- set-level completion status
- publishable complete set shards
- explicit non-standard reference lane handling
- suppression reports for unsupported structured claims
- adjudication reports for final finish/number conflicts
- a clean separation between Master Index truth and Grookai DB reconciliation

Final checkpoint state:

| metric | value |
| --- | --- |
| standard publishable-complete sets | 199 |
| non-standard reference lanes | 2 |
| source gap queue items | 0 |
| working card identity facts | 21520 |
| master-admissible card identity facts | 21520 |
| working printing facts | 38841 |
| master-admissible printing facts | 38841 |
| adjudicated excluded printing facts | 5 |
| DB writes performed | false |
| migrations created | false |

Chaos Rising was included in the completed Master Index:

| field | value |
| --- | --- |
| set_key | me04 |
| set_name | Chaos Rising |
| cards | 122/122 |
| printings | 247/247 |
| finishes | normal: 113, reverse: 76, holo: 58 |

## Lessons Learned

### Build the Reference Before Reconciliation

Reconciling Grookai against an incomplete Master Index creates false confidence.

The correct order is:

1. Build the independent source-backed Master Index.
2. Mark each set as complete, incomplete, blocked, or non-standard.
3. Export only master-admissible facts.
4. Compare Grookai read-only against complete sets.
5. Apply DB changes only through a separate approved write workflow.

### API Agreement Is Useful But Not Enough

TCGdex and PokemonTCG.io are valuable structured sources, but two APIs can agree while still missing finish nuance.

Finish truth requires at least one human-readable, official, marketplace-checklist, or collector-reference source supporting the exact card-level finish fact.

### General Rules Are Not Card-Level Truth

A set-level statement such as "this set has reverse holos" or "this product has stamped variants" is not enough to create exact rows.

Exact finish truth means:

```text
set + card_number + card_name + finish_key
```

General rules may guide review, but they must not create printings unless exact card-level coverage is source-backed.

### Source Exhaustion Is Different From Completion

Remaining facts can resolve in three different ways:

- promoted into working truth when exact independent evidence is found
- suppressed when structured-only claims are unsupported by exact checklist evidence
- adjudicated out when reviewed evidence points to a different finish or number

The final five rows were not "unfinished." They were reviewed blocker facts and excluded from working truth because the evidence did not support the claimed finish or number.

### Non-Standard Lanes Need Separate Policy

Jumbo and sample cards should not block the standard English physical set index.

They remain reference lanes with explicit non-standard status until they receive their own governed completion rules.

## Source Volatility

Several source families were volatile:

- live API availability varied
- set aliases changed between sources
- web pages and price guides moved or exposed partial rows
- TLS/certificate issues affected local collection
- marketplace products used inconsistent finish language
- older checklist pages lacked clean machine-readable structure

The pipeline had to treat volatility as normal, not exceptional.

Important invariant:

```text
Live source availability may add evidence, but it must not delete or hide preserved snapshot-backed evidence.
```

## Preservation

Source preservation became mandatory because a valid prior evidence row can disappear from live retrieval for reasons unrelated to truth.

Preservation rules established during the work:

- cached snapshot evidence remains additive
- live and snapshot rows are unioned before dedupe
- source aliases are remapped to canonical set keys before classification
- source volatility cannot lower a previously healthy deterministic baseline without explicit review
- preserved evidence must retain source key, source kind, source URL or stable identifier, retrieval time, and raw snapshot reference

Preservation does not mean every old claim is truth. Preserved claims still pass through source agreement, suppression, and adjudication gates.

## Governance Lessons

### Suppression Must Be Reported, Not Hidden

Structured-only finish claims unsupported by exact checklist evidence are excluded from working truth, but they remain visible in suppression reports.

This keeps the Master Index strict without losing audit history.

### Adjudication Must Be Separate From Promotion

The final blocker rows proved that "not promoted" is not specific enough.

Rows need explicit adjudication outcomes:

- exact evidence found and promotable
- wrong finish
- wrong card number or alias
- conflicting evidence
- source exhausted
- non-standard reference lane

### Write Readiness Is Not Completion

The Master Index can be complete while Grookai writes remain blocked.

Completion says the reference is ready.

Write readiness requires a separate controlled apply plan, rollback path, and post-apply proof.

## Permanent Rules Carried Forward

- Build and complete the Master Index first.
- Do not reconcile against incomplete reference truth.
- Do not promote API-only finish facts.
- Do not infer reverse holo, stamped, parallel, cosmos, cracked ice, Poke Ball, Master Ball, or product-exclusive variants.
- Preserve source evidence across volatile rebuilds.
- Treat suppressed claims as audit history, not truth.
- Treat adjudicated exclusions as completion-safe, not deletion authority.
- Keep DB writes outside Master Index build workflows.

## Related Artifacts

- `docs/contracts/VERIFIED_MASTER_SET_INDEX_V1.md`
- `docs/contracts/ENGLISH_MASTER_INDEX_COMPLETION_V1.md`
- `docs/contracts/MASTER_INDEX_GOVERNANCE_CONTRACT_V1.md`
- `docs/audits/english_master_index_completion_v1/english_master_index_completion_v1.json`
- `docs/audits/english_master_index_completion_v1/english_master_index_adjudicated_excluded_printings_v1.json`
- `docs/audits/english_master_index_publishable_v1/english_master_index_publishable_manifest_v1.json`
- `docs/checkpoints/master_index/20260608_english_master_index_completion_checkpoint_v1.md`
- `docs/checkpoints/master_index/20260614_english_canon_completion_retrospective_v1.md`
- `docs/checkpoints/image_truth/IMAGE_TRUTH_DISPLAY_COVERAGE_COMPLETION_20260616.md`

## Later Canon Follow-Up

On 2026-06-16, the same governance pattern was extended from printing truth to Image Truth V1.

English physical image display coverage reached:

| metric | value |
| --- | ---: |
| english_physical_child_printings | 38,111 |
| english_physical_display_covered_rows | 38,111 |
| english_physical_missing_display_rows | 0 |
| english_physical_exact_rows | 23,178 |
| english_physical_representative_rows | 432 |
| english_physical_missing_variant_visual_rows | 14,501 |

The Image Truth follow-up did not change the Master Index standard. It confirmed a related rule:

```text
Incomplete but honest is acceptable.
Confident but fake is not.
```

Representative images are allowed only when labeled honestly. Exact images require exact visual-variant proof.
