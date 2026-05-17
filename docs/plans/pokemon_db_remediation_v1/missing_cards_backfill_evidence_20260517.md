# Missing Cards Backfill Evidence 2026-05-17

Status: no-write evidence artifact. No Supabase writes, migrations, inserts, updates, deletes, card movement, set creation, mapping movement, identity rewrites, metadata merges, or variant changes are authorized by this document.

## Purpose

Classify the 617 PkmnCards missing checklist rows before any backfill implementation exists.

This pass applies the newer remediation evidence to the original missing-card audit:

- alias route fixes are complete for `sv3pt5` and `sm35`;
- alias metadata has a preserve/review-only policy;
- missing set universe decisions are classified;
- number-normalization evidence is available and shows 997 recoverable missing direct numbers.

The result is a backfill planning queue, not an insert queue.

## Source Evidence

- `docs/audits/pokemon_master_set_audit_v1/summary.json`
- `docs/plans/pokemon_db_remediation_v1/missing_set_universe_decision_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/missing_set_universe_decision_matrix_20260517.json`
- `docs/plans/pokemon_db_remediation_v1/number_normalization_evidence_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/number_normalization_evidence_matrix_20260517.json`
- `docs/plans/pokemon_db_remediation_v1/set_alias_route_classification_execution_20260517.md`

## Headline Findings

| Finding | Count |
| --- | ---: |
| Audit groups with missing checklist rows | 52 |
| Missing checklist rows from audit | 617 |
| Missing secret-range rows from audit | 30 |
| Recommended immediate card inserts | 0 |

## Backfill Lane Summary

| Lane | Groups | Missing rows | Secret rows | Decision |
| --- | ---: | ---: | ---: | --- |
| Source route or existing target, no insert | 2 | 110 | 0 | Prove mapping/routing to existing DB ownership. |
| Target set needed before card backfill | 4 | 117 | 0 | Build target-set dry-run first. |
| Special policy blocked | 12 | 106 | 8 | Decide energy/special collection policy first. |
| Number normalization first | 6 | 54 | 5 | Normalize/re-audit before considering inserts. |
| Name mismatch or identity review first | 9 | 90 | 0 | Resolve mismatch coverage before inserts. |
| Secret-range high risk | 1 | 39 | 16 | Separate secret evidence pack required. |
| Canonical alias blocked | 1 | 10 | 0 | Resolve target set alias ownership first. |
| Secret-range review first | 1 | 25 | 1 | Prove secret ownership before any insert. |
| Established set candidate after preflight | 16 | 66 | 0 | Eligible only for future row-level dry-run. |

## Important Refinements Since The Original Plan

### Shiny Vault

Original audit signal: 94 missing rows and no DB match.

Current decision: do not create or insert first. Live evidence found existing DB row `sma` / `Hidden Fates Shiny Vault` with 94 card prints. The next action is source-route/equivalence evidence, not card backfill.

### Rumble

Original audit signal: 16 missing rows and no DB match.

Current decision: do not create or insert first. Live evidence found existing DB row `ru1` / `Pokemon Rumble` with 16 card prints and canonical classification. The next action is 16-of-16 checklist equivalence and source alias planning.

### TCG Classic And McDonald's Match Battle 2023

The Classic deck checklists and McDonald's Match Battle 2023 are high-confidence physical product targets, but card backfill cannot happen until target-set creation is separately planned and approved.

Blocked target-set-first groups:

- `CLB` Pokemon Trading Card Game Classic - Blastoise: 34 rows.
- `CLC` Pokemon Trading Card Game Classic - Charizard: 34 rows.
- `CLV` Pokemon Trading Card Game Classic - Venusaur: 34 rows.
- `M23` McDonald's Match Battle 2023: 15 rows.

### Number Normalization

The number evidence pack found 997 rows where both `card_prints.number` and `card_prints.number_plain` are missing but recoverable from TCGdex source identifiers.

This matters because several apparent missing-card gaps overlap sets with recoverable number evidence. Any insert before number normalization risks creating duplicate cards that already exist under null-number rows.

Number-normalization-first groups from the missing-card audit include:

- Legendary Treasures: 20 missing rows.
- Arceus: 12 missing rows.
- Call of Legends: 11 missing rows.
- Scarlet & Violet Promos: 8 missing rows, including 5 secret-range rows.
- XY Promos: 2 missing rows.
- Phantom Forces: 1 missing row.

### Secret-Range Rows

The audit found 30 missing secret-range rows. None are approved for insert.

Current secret-risk buckets:

- Mega Evolution Promos: 16 secret-range rows.
- Scarlet & Violet Energy: 8 secret-range rows, policy blocked.
- Scarlet & Violet Promos: 5 secret-range rows, number-normalization first.
- Guardians Rising: 1 secret-range row, secret ownership review first.

## Candidate Queue

### Queue 0: Re-Audit After Blockers

Before any card insert dry-run, rerun or refresh the master audit after:

- source routing is proven for Shiny Vault and Rumble;
- Lane A number normalization is either completed or intentionally deferred;
- target-set decisions exist for Classic decks and M23;
- energy/special collection policy is decided.

### Queue 1: Non-Insert Source Route Evidence

Rows: 110.

- Shiny Vault -> prove route/equivalence to `sma`.
- Rumble -> prove route/equivalence to `ru1`.

Acceptance: missing-card count becomes zero for those groups without card inserts.

### Queue 2: Target Set Dry-Run Before Card Rows

Rows: 117.

- Classic Blastoise.
- Classic Charizard.
- Classic Venusaur.
- McDonald's Match Battle 2023.

Acceptance: one approved canonical target set per checklist before any row-level card plan.

### Queue 3: Number Normalization First

Rows: 54 plus secret risk in SVP.

Acceptance: row-level missing-card candidates remain missing after number normalization and audit rerun.

### Queue 4: Policy-Blocked Special Collections

Rows: 106.

This includes energy-only sets, Box Topper, Victory Medals, World Collection, and Scarlet & Violet Energy.

Acceptance: explicit app support policy and target ownership model.

### Queue 5: Existing Set Candidate Dry-Run

Rows: 66.

These are the lowest-friction future candidates, but still require row-level proof:

- Burning Shadows.
- Crimson Invasion.
- Sun & Moon.
- Shining Legends.
- Stormfront.
- Platinum.
- Sun & Moon Promos.
- Unified Minds.
- Fates Collide.
- Supreme Victors.
- Cosmic Eclipse.
- Ancient Origins.
- BREAKpoint.
- BREAKthrough.
- Flashfire.
- Generations.

Acceptance: every candidate has target set, printed number, source URL, source corroboration, no existing same-number row, no recovered null-number row, no active mapping conflict, and no identity conflict.

## Stop Conditions

Any future backfill dry-run or write plan must stop if:

- target set ownership is unresolved;
- the target set is in a canonicalization hard stop;
- the candidate belongs to a missing target set not yet approved;
- number normalization could reveal an existing row;
- the candidate is secret-range and ownership is not proven;
- name mismatch review is unresolved;
- source URL, printed number, or source set label is missing;
- an external mapping already points to a different card print;
- an active identity row conflicts with the candidate;
- the candidate would require variant or finish rows;
- the plan includes any Supabase write without explicit approval.

## No-Write Confirmation

This evidence pack authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set creation, mapping movement, identity rewrites, metadata merges, missing-card backfill, or variant changes.
