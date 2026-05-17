# ME01 Duplicate Resolution Design - 2026-05-17

Status: no-write design only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.

## Purpose

Define the future cleanup shape for the `me01` Mega Evolution duplicate ownership problem without executing it.

The `me01` evidence proves this is not a number-normalization job. It is duplicate ownership remediation:

- 83 missing-number TCGdex-only candidate rows.
- 83 one-for-one numbered incumbent rows.
- 83/83 pairs have the same normalized name and proposed printed number.
- 81 candidate rows have no user/market references.
- 2 candidate rows have vault/pricing references and require hard-stop handling.

## Source Evidence

- `number_normalization_collision_investigation_20260517.md`
- `number_normalization_collision_investigation_matrix_20260517.json`
- `number_normalization_me01_duplicate_ownership_20260517.md`
- `number_normalization_me01_duplicate_ownership_matrix_20260517.json`

## Non-Goals

- No number normalization.
- No card inserts.
- No set changes.
- No set canonicalization.
- No metadata merge.
- No missing-card backfill.
- No variant work.
- No deletes.
- No FK migration.
- No mapping movement.
- No identity rewrite.

## Canonical Survivor Selection Rules

The future canonical survivor for each duplicate pair should be the incumbent numbered row when all gates pass:

- incumbent has direct `card_prints.number` and `card_prints.number_plain`;
- incumbent has active JustTCG and TCGPlayer mappings;
- candidate is missing both direct number fields;
- candidate has active TCGdex mapping only;
- candidate and incumbent share normalized card name;
- candidate proposed TCGdex local number equals incumbent direct printed number;
- incumbent has existing market/pricing/variant/vault surface ownership;
- no conflicting active identity row exists.

The TCGdex-only candidate row must not become survivor by default. It has source evidence that should be preserved, but it lacks printed-number ownership and collides with the numbered market-owned row.

## Mapping Preservation

Future cleanup should preserve the TCGdex source identity by attaching the TCGdex external mapping to the incumbent survivor.

Required future behavior:

- keep the TCGdex external id, for example `me01-022`;
- preserve the original candidate row id in audit evidence before any movement;
- ensure the incumbent does not already own a conflicting active TCGdex mapping;
- ensure the source/external id does not become active on two card_print ids;
- move or recreate active mapping ownership only inside a reviewed transaction;
- keep a historical inactive mapping or audit note if the schema supports it;
- do not drop candidate source evidence merely because the candidate row later becomes inactive or quarantined.

No mapping movement is authorized by this design.

## Reference Preservation

The future write plan must inventory and preserve every FK reference before any candidate row can be retired.

Reference categories:

- source/provenance: `external_mappings`, source identifiers, source payload evidence;
- identity/search: `card_print_identity`, `card_print_traits`, `card_printings`;
- market/pricing: `pricing_watch`, JustTCG variants/prices, price snapshots;
- ownership/user: `vault_items`, `vault_item_instances`, `shared_cards`, slab/cert tables;
- derived/runtime: any materialized/search/projection surface found by fresh schema discovery.

Rules:

- no delete until every FK table has a proven migration or preservation strategy;
- no candidate retirement if user/vault/pricing references remain on the candidate;
- no incumbent overwrite of identity fields unless a separate identity plan approves it;
- no variant/printing movement unless a separate variant authority plan approves it;
- post-write checks must prove row counts and FK ownership changed exactly as approved.

## Two Referenced Candidate Rows

The two TCGdex candidate rows with user/market references are hard-stop subcases:

| Card | Proposed number | Candidate reference tables | Incumbent reference rows |
| --- | --- | --- | ---: |
| Mega Camerupt ex | 22 | `pricing_watch.card_print_id`, `vault_item_instances.card_print_id`, `vault_items.card_id` | 20 |
| Mega Lucario ex | 77 | `pricing_watch.card_print_id`, `vault_item_instances.card_print_id`, `vault_items.card_id` | 28 |

These two rows must not be handled by the same lightweight path as the other 81 duplicate candidates.

Future handling options, still no-write:

- preserve candidate row and add a duplicate-link/alias/quarantine state if the schema supports it;
- migrate vault/pricing references to the incumbent only after proving ownership equivalence and rollback;
- preserve the original candidate reference history for audit;
- verify public vault views and pricing surfaces still show the same user-owned card after any future reference migration.

## Future Write-Plan Shape

A future write plan, if explicitly authorized later, should split into two phases.

### Phase A: 81 Unreferenced Candidate Rows

Potential future operations:

- snapshot candidate and incumbent rows;
- attach candidate TCGdex external mappings to incumbent rows after uniqueness checks;
- preserve candidate identity/source evidence;
- mark candidate rows as duplicate/quarantined/inactive only if a supported non-destructive mechanism exists;
- do not delete candidate rows.

### Phase B: 2 Referenced Candidate Rows

Potential future operations:

- snapshot all candidate and incumbent FK references;
- prove vault/pricing ownership equivalence;
- design one explicit reference migration path per table;
- require post-migration UI/API checks for vault and pricing surfaces;
- leave candidate rows in place if any reference preservation gate is unclear.

Phase B must not run as a bulk extension of Phase A.

## Rollback Strategy

Any future executable plan must snapshot before-values for:

- both card_print rows in each pair;
- all active/inactive external mappings for both sides;
- all card_print_identity rows for both sides;
- all card_printings and traits for both sides;
- all vault/pricing/variant/user references;
- any duplicate/quarantine marker introduced by the future plan.

Rollback must restore:

- mapping ownership to the original candidate row;
- candidate and incumbent row fields;
- FK references to their original card_print ids;
- active/inactive flags;
- timestamps if they are changed;
- source evidence and audit notes.

Rollback must not use delete as the primary mechanism.

## Hard Stop Gates

Stop before execution if:

- any `me01` pair count is not 83;
- any pair no longer has exactly one candidate and one incumbent;
- any candidate has a direct number already;
- any incumbent loses direct number ownership;
- any candidate has active mappings other than TCGdex;
- any incumbent lacks JustTCG or TCGPlayer mapping;
- any TCGdex external id would be active on two card_print ids after the plan;
- any new user/vault/pricing reference appears on the 81 unreferenced candidates;
- the two referenced candidates are included in the 81-row path;
- no rollback table/snapshot is created;
- the plan includes deletes.

## Post-Write Audit Queries

Future post-write checks must prove:

- `me01` duplicate candidate count decreased only by the approved mechanism;
- no card_print rows were deleted;
- no set rows changed;
- no missing-card backfill occurred;
- active TCGdex mappings now resolve to the intended survivor rows;
- no active duplicate source/external mapping exists;
- vault/pricing references for Mega Camerupt ex and Mega Lucario ex are preserved exactly;
- master set and number-normalization audits rerun cleanly for the approved scope.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No card movement.
- No set changes.
- No identity rewrites.
- No mapping movement.
- No missing-card backfill.
- No variant changes.
