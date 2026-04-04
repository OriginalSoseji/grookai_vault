# PAF_REALIGNMENT_V2

## Context

Paldean Fates has two proven live families sharing the same printed set abbreviation `PAF`:

- `sv04.5` = base/main family currently sitting on null `gv_id` parents
- `sv4pt5` = shiny family currently occupying live unsuffixed `GV-PK-PAF-*`

Under [GV_ID_VARIANT_SUFFIX_CONTRACT_V2](/C:/grookai_vault/docs/contracts/GV_ID_VARIANT_SUFFIX_CONTRACT_V2.md):

- base/main must own `GV-PK-PAF-###`
- shiny must own `GV-PK-PAF-###-S`

This phase replaces the prior pairwise overlap gate with a family gate for Paldean Fates only.

## Problem

The old runner stopped on `NON_OVERLAPPING_SHINY_ROWS` because it required exact same-name same-number pairing before reassigning shiny rows.

That rule is no longer authoritative for Paldean Fates.

The locked family truth for this phase is:

- all `sv4pt5` rows are shiny-family
- all `sv04.5` null-`gv_id` rows are base/main-family

## Decision

Use family-gated namespace realignment:

1. reassign every in-scope `sv4pt5` row from unsuffixed `GV-PK-PAF-###` to `GV-PK-PAF-###-S`
2. then promote every in-scope `sv04.5` row to unsuffixed `GV-PK-PAF-###`

Same-name same-number overlap remains audit information only.

It is not a blocker in V2.

## Proof

### Frozen scope

- base promotion candidates (`sv04.5`, parent `gv_id is null`) = `245`
- shiny reassignment candidates (`sv4pt5`, parent `gv_id is not null`) = `245`
- informational same-name same-number overlap count = `146`

### Deterministic mapping

- shiny target format: `GV-PK-PAF-###-S`
- base target format: `GV-PK-PAF-###`

Examples:

- shiny `Snover` `100`: `GV-PK-PAF-100` -> `GV-PK-PAF-100-S`
- base `Snover` `100`: `null` -> `GV-PK-PAF-100`

### Collision audit

- base duplicate printed-number groups = `0`
- unexpected shiny old `gv_id` rows = `0`
- proposed shiny suffix collisions = `0`
- proposed base post-realign collisions = `0`
- out-of-scope collisions = `0`

These are the hard safety gates for V2.

## Backup

Pre-apply backups created:

- [paf_realignment_v2_preapply_schema.sql](/C:/grookai_vault/backups/paf_realignment_v2_preapply_schema.sql)
- [paf_realignment_v2_preapply_data.sql](/C:/grookai_vault/backups/paf_realignment_v2_preapply_data.sql)

## Apply Order

1. reassign all `sv4pt5` shiny rows to suffixed `-S`
2. verify unsuffixed `PAF` namespace is free
3. promote all `sv04.5` base rows to unsuffixed `PAF`

Exact old-value guards are required on shiny rows.

## Risks

- public URL change for existing `sv4pt5` shiny rows
- partial namespace drift if apply order is violated
- collision if any live row outside the two PAF families already owns a target id

## Mitigation

- family-wide dry-run proof
- explicit collision audit
- exact old-value guards on shiny reassignment
- rollback-safe transaction with batched updates
- no out-of-scope row updates

## Post-Apply Truth

Execution completed successfully.

- shiny reassignment count = `245`
- base promotion count = `245`
- remaining null base rows in scope = `0`
- remaining unsuffixed shiny rows in scope = `0`
- live PAF `gv_id` collision count = `0`
- active identity total remained unchanged

## Sample Before / After

- shiny `Pineco` `1`: `GV-PK-PAF-1` -> `GV-PK-PAF-1-S`
- shiny `Snover` `100`: `GV-PK-PAF-100` -> `GV-PK-PAF-100-S`
- base `Pineco` `001`: `null` -> `GV-PK-PAF-001`
- base `Snover` `100`: `null` -> `GV-PK-PAF-100`

## Status

COMPLETED SUCCESSFULLY
