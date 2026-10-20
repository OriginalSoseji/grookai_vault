# Pricing Checkpoint 159: MTG Exact-Finish Missing-Number Bridge

## Status

`IMPLEMENTED - PRODUCTION ROLLBACK REHEARSAL PASSED, RELEASE PENDING`

## Problem

The latest complete pricing qualification selected 208,634 observations and
published 168,340. Of the 40,294 held or excluded rows, 7,430 MTG observations
have a positive provider market price and otherwise complete canonical
identity, but the source product lacks printed-number text. The general policy
correctly holds rows without that evidence.

These 7,430 rows also have stronger independent evidence: each has exactly one
active `tcgplayer_market` `productId:finish` mapping, and that mapping points to
the same canonical printing selected by the existing exact child-finish lane.
No row in the audited cohort lacks a finish mapping or has an ambiguous or
conflicting target.

## Repair

Migration `20261020062000_mtg_exact_finish_missing_number_bridge_v1.sql`
adds candidate view V6. For category 1 Normal/Foil rows, V6 may replace the
ordinary parent and variant assignment lineage with `mtg_printing_mapping_id`
only when all of these facts are true:

- printed-number evidence is absent;
- the ordinary lane resolved exactly one card, one printing, and one identity
  domain;
- the ordinary lane assigned an exact child finish;
- the active `productId:finish` mapping resolves to that same printing;
- the printing is nonprovisional, visible, and has exactly one active English
  paper identity.

The publication policy accepts absent printed-number text only after the row is
projected into that exact MTG printing-mapping lane. The database's existing
MTG decision and snapshot guards then revalidate the source observation,
mapping, printing, finish, price, visibility, and durable lineage.

## Audited Scope

- Missing-number-only MTG observations: 7,430
- Positive provider market prices: 7,430
- Exact independent finish mappings: 7,430
- Same-parent and same-finish targets: 7,379
- Rows without a finish mapping: 0
- Ambiguous or conflicting rows: 0

The production-schema rehearsal also found 516 other exact mapped rows without
printed-number text. They remain held by unchanged policy: 482 lack a positive
provider market price and 34 are unsupported product kinds.

The remaining 32,864 held or excluded rows are outside this change. Their
missing mappings, unsupported product types, or absent positive market prices
must remain explicit backlog.

## Release Gate

Run the focused pricing contracts and a rollback-only production-schema
rehearsal. The rehearsal must prove V6 returns all prior candidates unchanged,
projects exactly the audited cohort into `mtg_printing_mapping_id`, produces no
duplicate source observations, and leaves no V6 view after rollback. After
merge and schema application, run a fresh exact-commit full shadow against the
latest completed source sync. Activate only if reconciliation passes, all
7,430 new rows use exact MTG printing lineage, and broken source-to-price traces
remain zero.

## Verification

- Focused policy and integration contracts: 55 passed, 0 failed.
- Node syntax and repository diff checks passed.
- Rollback-only production-schema rehearsal passed against source sync
  `8886ee10-414e-49ed-ab04-b7b5670f6727`.
- V5 and V6 each returned 208,634 rows and 208,634 distinct observations.
- V6 retained all 7,430 audited identities and the production policy classified
  all 7,430 as publishable.
- No printing conflicts or rows carrying both exact MTG and generic assignment
  lineage were found.
- V6 existed inside the rehearsal transaction and `to_regclass` returned null
  after rollback.
- Receipt:
  `C:\grookai_vault_operator_artifacts\pokemon_pricing_repair_20261012\mtg_finish_bridge_20261018\missing_number_bridge_rollback_rehearsal.json`.
