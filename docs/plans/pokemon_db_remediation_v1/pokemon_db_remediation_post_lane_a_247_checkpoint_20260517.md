# Pokemon DB Remediation Post Lane A 247 Checkpoint - 2026-05-17

Status: post-execution checkpoint. This document records read-only audit and public-site verification after the approved Lane A 247 number-normalization transaction. It authorizes no additional Supabase writes, migrations, inserts, updates, deletes, missing-card backfills, variant work, scanner work, deploys, or production mutation.

## 247 Execution Summary

| Item | Result |
| --- | --- |
| Execution commit | 67f3f32 |
| Rows updated | 247 |
| Explicit update column | card_prints.number |
| Generated column verified | card_prints.number_plain |
| Non-number target column changes | 0 |
| Related object hash changes | 0 |
| Fresh read-only exact matches | 247 |

## Audit Deltas

| Metric | Before | After | Delta |
| --- | --- | --- | --- |
| Missing checklist rows vs PkmnCards | 617 | 613 | -4 |
| Missing number rows | 997 | 750 | -247 |
| Lane A candidates | 504 | 257 | -247 |
| Clean future write candidates | 248 | 1 | -247 |
| Collision-blocked rows | 256 | 256 | 0 |
| Missing secret rows | 30 | 30 | 0 |

## Website Display Verification Summary

| Surface | Pass | Total | Notes |
| --- | --- | --- | --- |
| Alias routes | 5 | 5 | required search aliases route to expected set pages |
| Hard-stop route safety | 8 | 8 | no tested hard-stop code redirected to its paired code |
| Card samples | 8 | 24 | direct card pages and resolver API checked; rows without gv_id have no public card route |
| Set samples | 0 | 5 | set page/API checked for affected sets |

## Corrected Public Display Interpretation

Blank or hidden `card_prints.set_code` is not a user-facing defect. Grookai product display uses set name as the public display authority; set code is internal routing/debug identity. The prior set-level failure interpretation is superseded by this rule.

The remaining public issue is stable public addressability through `gv_id`, plus image-only gaps where rows already have a public route.

## GV-ID Public Coverage

| Metric | Count |
| --- | ---: |
| Lane A rows audited | 247 |
| Has gv_id | 29 |
| Missing gv_id | 218 |
| Has set name | 247 |
| Missing set name | 0 |
| Has card number | 247 |
| Missing card number | 0 |
| Has image_url | 185 |
| Missing image_url | 62 |
| Public web app route eligible | 29 |
| Public-ready by DB coverage | 4 |

Focused website sample verification using the set-name display rule checked 30 rows. Result: 12 pass, 18 fail. All 18 failures were missing-`gv_id` public-route failures. No sampled row with an existing `gv_id` failed the corrected card-name, set-name, number, image, and search checks.

## GV-ID Generation Evidence

The no-write generation/backfill evidence pack audited all 218 missing-`gv_id` Lane A rows and recommends zero immediate writes.

| Metric | Count |
| --- | ---: |
| Missing-gv_id rows audited | 218 |
| Builder candidate rows | 218 |
| Internal proposed-gv_id duplicates | 0 |
| Exact live gv_id collisions | 0 |
| Blocked duplicate-public-owner rows | 10 |
| Namespace/source policy review rows | 208 |
| Recommended immediate writes | 0 |

`mep` is blocked because the 10 missing rows duplicate existing public MEP rows that already own padded `GV-PK-MEP-001` through `GV-PK-MEP-010`. `A3a`, `P-A`, and `fut2020` have collision-free candidate strings but no established same-set public namespace pattern, so they need explicit namespace/source-domain approval before any write-plan candidate exists.

## Namespace / Source Policy

The follow-up policy pass defined the 208 policy-review rows and approves zero for a future write plan.

| Set | Rows | Policy | Future write status |
| --- | ---: | --- | --- |
| `A3a` | 103 | source-domain policy blocked | not approved |
| `P-A` | 100 | source-domain policy blocked | not approved |
| `fut2020` | 5 | physical special collection review | namespace/number contract required |

Generated IDs for these rows remain evidence only. `A3a` and `P-A` stay out of public card routes under current physical public identity rules. `fut2020` may be eligible later, but only after an explicit `FUT2020` namespace and printed-number token policy decides `1-5` versus `001-005`.

The 10 `mep` rows are isolated in a separate manual collision pack. They are duplicate-resolution candidates, not GV-ID backfill candidates, because existing public owners already use padded `GV-PK-MEP-001` through `GV-PK-MEP-010`.

## MEP Duplicate Resolution Design

The no-write MEP duplicate-resolution design now proves the current cleanup shape.

| Metric | Count |
| --- | ---: |
| Duplicate pairs audited | 10 |
| Existing public-owner survivor candidates | 10 |
| Pairs with same normalized name and number | 10 |
| Duplicate rows with `gv_id` | 0 |
| Duplicate rows with user/market refs | 0 |
| Survivor rows with `gv_id` | 10 |
| Pairs requiring TCGdex mapping preservation | 10 |
| Manual hard-stop pairs | 0 |
| Recommended immediate writes | 0 |

The recommended survivor for each pair is the existing padded public owner row. The duplicate/source row must not receive an unpadded public ID; its TCGdex source mapping is preservation evidence for a future prewrite gate only. Live evidence also shows the 20 MEP rows appear in app-facing search/web views by internal row identity, so any future execution must verify search resolves or prefers the padded public-owner rows without loosening `/card/[gv_id]` gate rules.

## Remaining Blocked Lanes

- 256 collision rows remain blocked.
- All 83 `me01` duplicate rows remain blocked.
- Grey Felt Hat Pikachu remains a one-row manual evidence lane.
- Hard-stop and review-stop sets remain blocked.
- Missing-card backfill remains blocked.
- Variant work remains blocked.

## Next Recommended Queue

1. Draft the MEP duplicate-resolution prewrite evidence gate only if source-mapping preservation is explicitly desired; do not execute it yet.
2. Draft a `fut2020` namespace/printed-number contract if public routes for that physical special collection are desired.
3. Keep `A3a` and `P-A` blocked unless a separate source-domain inclusion contract is approved.
4. Keep image-only gaps separate from `gv_id` work; 25 McDonald's Collection 2021 rows have public routes but missing `image_url`.
5. Keep Grey Felt Hat as a manual referenced-row decision.
6. Continue collision-row ownership packs before any further number writes.
7. Keep missing-card backfill frozen until set and number blockers clear.

## No-Write Confirmation

- No Supabase writes occurred in this audit pass.
- No migrations.
- No inserts, updates, or deletes.
- No data changes.
- No deploy.
