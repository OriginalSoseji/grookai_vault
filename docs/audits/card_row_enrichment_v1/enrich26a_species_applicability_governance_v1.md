# ENRICH-26A Species Applicability Governance V1

## Result

- Audit only: true
- DB writes performed: false
- Migrations created: false
- Fingerprint: `f9676a8eb9e5f5b7c7c40554349a87299809edd659a41057b860f396c27ae81c`

## What This Means

A missing `card_print_species` row is not automatically a defect. Trainer, Energy, item, stadium, tool, and other non-Pokemon rows should not receive species links. This report separates true species enrichment candidates from rows where species is not applicable.

## Totals

| metric | rows |
| --- | --- |
| missing_species_parent_rows | 3741 |
| not_applicable_rows | 3579 |
| maybe_applicable_review_rows | 1 |
| unknown_until_traits_rows | 161 |
| insert_candidate_rows | 0 |
| write_ready_rows | 0 |

## Classification

| classification | rows |
| --- | --- |
| species_not_applicable_trainer | 2885 |
| species_not_applicable_energy | 693 |
| blocked_missing_traits | 161 |
| species_not_applicable_trait_blocked_subject_reference | 1 |
| species_rule_or_seed_review_needed | 1 |

## Applicability

| applicability | rows |
| --- | --- |
| not_applicable | 3579 |
| unknown_until_traits_exist | 161 |
| maybe_applicable | 1 |

## Governance Recommendation

- Do not treat every missing card_print_species row as enrichment debt. Species applies to Pokemon subjects, not trainer, energy, object, or checklist utility cards.
- Next action: No species write package is currently ready. Consider adding a species_applicability status/reporting layer so not-applicable rows stop appearing as unresolved debt.

## Review Samples

| set | number | name | classification | notes |
| --- | --- | --- | --- | --- |
| bwp | 28 | Tropical Beach | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 28 | Tropical Beach | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 29 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 29 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 29 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 29 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 30 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 30 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 30 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 30 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 31 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 31 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 31 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 31 | Victory Cup | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 50 | Tropical Beach | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| bwp | 50 | Tropical Beach | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| dpp | 05 | Tropical Wind | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| ecard3 | 47 | Buried Fossil | species_rule_or_seed_review_needed | Pokemon-like traits exist but current species seed/rule does not map the name. |
| gym2 | 119 | Rocket's Minefield Gym | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| me03 | 068 | Antique Jaw Fossil | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| me03 | 069 | Antique Sail Fossil | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| me03 | 070 | Core Memory | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| me03 | 071 | Crushing Hammer | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| me03 | 074 | Hole-Digging Shovel | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
| me03 | 075 | Jacinthe | blocked_missing_traits | No trait context exists; species applicability cannot be determined safely. |
