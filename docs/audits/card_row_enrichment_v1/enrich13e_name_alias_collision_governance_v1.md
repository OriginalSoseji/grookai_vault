# ENRICH-13E Name Alias Collision Governance V1

Read-only governance plan for non-promo name/alias collision blockers.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- This report is not apply authority.

## Summary

- Target rows: 1
- Deterministic alias rows: 0
- Manual-blocked rows: 1
- Write-ready now: false
- Recommended strategy: `split_deterministic_alias_duplicate_transfer_from_manual_identity_review`

## Bucket Counts

| bucket | rows |
| --- | --- |
| manual_collision_adjudication_required | 1 |

## Set Counts

| set_code | rows |
| --- | --- |
| pl2 | 1 |

## Dependency Totals

| lane | dependency | rows |
| --- | --- | --- |
| manual_duplicate | child_count | 2 |
| manual_duplicate | active_identity_count | 1 |
| manual_duplicate | active_mapping_count | 1 |
| manual_duplicate | trait_count | 1 |
| manual_duplicate | species_count | 1 |
| manual_duplicate | vault_instance_count | 0 |
| manual_canonical_owner | child_count | 1 |
| manual_canonical_owner | active_identity_count | 1 |
| manual_canonical_owner | active_mapping_count | 2 |

## Governance Decision

Deterministic decision: `duplicate_alias_rows_can_become_dependency_transfer_candidates_after_dry_run`

Manual decision: `manual_identity_difference_must_not_be_auto_merged`

Most rows are punctuation, gender-symbol, EX hyphenation, or known Platinum owner-name source alias differences. Luxray GL versus Luxray GL LV.X is materially different card-name text and must remain blocked until source evidence proves whether the duplicate row is wrong or incomplete.

Required dry-run law:

- canonical owner row must stay
- duplicate dependencies must be transferred or proven zero before delete
- active identity uniqueness must remain zero-conflict
- source mappings must end on canonical owner only
- manual-blocked rows must be excluded

Forbidden:

- do not overwrite canonical owner parent rows
- do not merge Luxray GL into Luxray GL LV.X without explicit evidence
- do not use normalized names alone for materially different suffixes
- do not delete dependency-bearing duplicate parents without transfer proof
- do not mint GV IDs for duplicate parents

## Deterministic Rows

_None._

## Manual-Blocked Rows

| set | number | duplicate_name | canonical_owner_name | source_id | reason |
| --- | --- | --- | --- | --- | --- |
| pl2 | 109 | Luxray GL | Luxray GL LV.X | pl2-109 | material_name_difference_requires_source_review |

## Future Package Shape

Package: `ENRICH-13E1-NAME-ALIAS-DUPLICATE-TRANSFER-DRY-RUN`

Current status: `not_write_ready_dry_run_required`

Required before real apply:

- fresh dependency snapshot
- guarded rollback-only dry-run
- before/after active identity uniqueness proof
- before/after external mapping uniqueness proof
- child printing duplicate proof
- rollback artifact

## Conclusion

Most 13E rows can likely become a deterministic duplicate-transfer dry-run. The Luxray GL row is intentionally blocked because normalized name similarity is not enough for a LV.X identity difference.

Fingerprint: `5e20e8466cd9a1509d22c2e23c5c393972754165523663cbeddf690f46209313`
