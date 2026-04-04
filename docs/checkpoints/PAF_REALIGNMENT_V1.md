# PAF_REALIGNMENT_V1

## Context

This phase isolates the Paldean Fates namespace conflict created by two separate live parent lanes sharing the same printed set abbreviation:

- `sv04.5` = base/main lane currently sitting on `gv_id is null`
- `sv4pt5` = existing canonical shiny lane currently owning unsuffixed `GV-PK-PAF-*`

Under [GV_ID_VARIANT_SUFFIX_CONTRACT_V2](/C:/grookai_vault/docs/contracts/GV_ID_VARIANT_SUFFIX_CONTRACT_V2.md), that public identity order is backward:

- base/main should keep unsuffixed `GV-PK-PAF-###`
- shiny should move to suffixed `GV-PK-PAF-###-S`

This makes the phase a namespace realignment plus promotion, not a simple promotion pass.

## Problem

The shiny lane currently occupies the unsuffixed Paldean Fates namespace.

That blocks lawful promotion of the missing base lane because:

- `sv04.5` base candidates derive to `GV-PK-PAF-###`
- `sv4pt5` shiny rows already own those unsuffixed public ids

## Decision

Audit completed.

Apply did **not** proceed.

Reason:

- `146` exact same-name same-number pairs prove a real overlapping base-vs-shiny collision surface
- but `99` live `sv4pt5` rows do **not** have an exact same-name same-number `sv04.5` counterpart
- under the locked hard gate, those `99` shiny-only rows cannot be reassigned to `-S` automatically without additional proof

So the phase stops lawfully before backup or write execution.

## Proof

### Frozen surface counts

- base candidate count (`sv04.5`, `gv_id is null`) = `245`
- shiny candidate count (`sv4pt5`, `gv_id is not null`) = `245`
- exact overlap count = `146`
- non-overlapping shiny count = `99`
- non-overlapping base count = `99`

### Base-lane integrity proof

- duplicate base printed-number groups = `0`
- every base candidate derives deterministic unsuffixed `GV-PK-PAF-###`

### Shiny suffix proof

- deterministic shiny suffix target uses the live V2 builder:
  - `GV-PK-PAF-###-S`
- proposed suffixed shiny collisions = `0`
- proposed base post-realign collisions = `0`
- out-of-scope collisions = `0`

### Collision surface proof

Representative overlapping rows:

- base `Snover` / `100` -> `GV-PK-PAF-100`
- shiny `Snover` / `100` currently -> `GV-PK-PAF-100`
- shiny target under V2 -> `GV-PK-PAF-100-S`

This confirms the namespace model is correct for the proven overlap surface.

### Blocking proof

Representative non-overlapping shiny rows:

- `Pineco` / `1` currently -> `GV-PK-PAF-1`
- `Magmortar` / `10` currently -> `GV-PK-PAF-10`
- `Numel` / `11` currently -> `GV-PK-PAF-11`

These rows have no exact same-name same-number `sv04.5` base counterpart in the audited base lane.

Under the locked phase rule:

- if any shiny rows do not have a proven base counterpart, stop

That stop condition triggered at `99`.

## GV_ID Rule Used

Source of truth:

- [buildCardPrintGvIdV1.mjs](/C:/grookai_vault/backend/warehouse/buildCardPrintGvIdV1.mjs)
- [GV_ID_VARIANT_SUFFIX_CONTRACT_V2](/C:/grookai_vault/docs/contracts/GV_ID_VARIANT_SUFFIX_CONTRACT_V2.md)

Applied forms:

- base/main: `GV-PK-PAF-###`
- shiny: `GV-PK-PAF-###-S`

## Risks

- public URL change for every reassigned shiny row
- accidental partial apply if shiny reassignment and base promotion are not ordered correctly
- hidden namespace collisions outside the two PAF families
- misclassifying shiny-only rows that lack a proven base counterpart

## Mitigation

- fail-closed dry-run first
- exact same-name same-number overlap map
- exact old-value guards in the planned runner
- ordered model:
  1. shiny reassignment
  2. namespace-free verification
  3. base promotion
- no apply when any non-overlapping shiny rows remain unproven

## Public Stability Note

This phase is explicitly allowed to change existing non-null `gv_id` values for the `sv4pt5` shiny lane **only if apply becomes lawful**.

That exception exists because the current unsuffixed shiny assignment is now proven to violate the V2 public identity model.

No such rewrite occurred in this run because the phase stopped before apply.

## Post-Apply Truth

No apply occurred.

- shiny reassigned count = `0`
- base promoted count = `0`
- shiny rows now using `-S` = `0`
- base rows now owning unsuffixed `GV-PK-PAF-*` = `0`
- live Paldean Fates namespace remains unchanged from pre-phase state

## Status

STOPPED LAWFULLY

Blocking condition:

- `NON_OVERLAPPING_SHINY_ROWS:99`

This phase cannot proceed safely until the `99` shiny-only `sv4pt5` rows are explicitly governed for suffix reassignment or excluded from the realignment model.
