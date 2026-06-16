# External Mapping Alias Residual Governance Plan V1

Audit-only residual governance plan after the product alias sidecar lane.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false

## Totals

| metric | value |
| --- | --- |
| residual_duplicate_groups | 5 |
| deterministic_candidate_groups | 0 |
| blocked_groups | 5 |
| projected_alias_rows_before_deactivation | 0 |
| projected_transfer_design_rows | 0 |

## By Actionability

| actionability | groups |
| --- | --- |
| blocked | 5 |

## By Proposed Rule

| rule | groups |
| --- | --- |
| justtcg_remaining_product_alias | 3 |
| blocked_pocket_alias_governance | 1 |
| tcgdex_suffix_alias_manual_review | 1 |

## Candidate Groups

_None._

## Blocked Groups

| source | set | number | name | actionability | reason |
| --- | --- | --- | --- | --- | --- |
| justtcg | A4a | 074 | Yamper | blocked | Pocket product aliases must be handled under Pocket-specific governance, not English physical source cleanup. |
| justtcg | svp | 107 | Mareep | blocked | All active JustTCG routes in this residual group are product/deck/prize/stamp aliases; no canonical non-product owner route exists to preserve aliases against. |
| justtcg | svp | 108 | Flaaffy | blocked | All active JustTCG routes in this residual group are product/deck/prize/stamp aliases; no canonical non-product owner route exists to preserve aliases against. |
| justtcg | svp | 109 | Ampharos | blocked | All active JustTCG routes in this residual group are product/deck/prize/stamp aliases; no canonical non-product owner route exists to preserve aliases against. |
| tcgdex | cel25c | 15 | Venusaur | blocked | Expected exactly one source ID matching printed number 15; found 0. |

## Recommended Next Step

No deterministic residual candidates remain; source-specific manual adjudication is required.

Fingerprint: `0376a1c0e492e3e7b0f204d426d56e812aecb3f3abdc1db076f0c986426d5133`
