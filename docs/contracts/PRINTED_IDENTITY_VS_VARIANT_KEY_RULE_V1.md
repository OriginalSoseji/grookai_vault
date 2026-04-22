# PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1

Status: ACTIVE  
Type: Route Selection Rule  
Scope: Resolving exact printed-number canon owners when current canon also carries a non-null `variant_key`, including rows currently labeled `alt`

## Authority

This rule aligns with:

- `docs/contracts/PRINTED_IDENTITY_MODEL_V1.md`
- `docs/contracts/CHILD_PRINTING_CONTRACT_V1.md`
- `docs/contracts/WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1.md`
- `docs/contracts/GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1.md`
- `docs/contracts/PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1.md`

## Purpose

Grookai already treats collector-number differences as separate canonical printed
identities.

Some existing canon rows also carry a non-null `variant_key` such as `alt`. That
label must not cause route resolution to reject an otherwise exact same-name
same-number printed identity owner.

This rule does not rewrite canon. It governs how route selection interprets
existing canon rows.

## Hard Rule

When two same-name rows differ by printed number inside the same set family:

- the differing printed numbers already make them separate printed identities
- route resolution must privilege the exact printed-number owner
- a non-null `variant_key` on that exact printed-number owner does not by itself
  invalidate the row as a lawful printed identity anchor

Short form:

- `printed_number` outranks `variant_key` for route selection when printed-number
  difference already separates the cards

## What This Rule Does Not Change

This rule does not globally outlaw `variant_key`.

`variant_key` remains lawful when another active contract requires it, including:

- stamped same-number overlays under `PRINTED_IDENTITY_MODEL_V1`
- same-name same-number coexistence under `PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1`
- other proven same-number identity-bearing collisions

This rule only says:

- if the card is already separated by printed number, that printed number is the
  canonical route discriminator

## Route Selection Rule

For an incoming source-backed row:

1. resolve exact same-name same-number canon owners first
2. if exactly one canon row owns that printed number, accept it as the printed
   identity anchor even when `variant_key` is non-null
3. do not reject that owner merely because same-name rows also exist at other
   printed numbers

Route resolution remains blocked only when:

- no exact same-name same-number owner exists
- multiple competing exact same-name same-number owners exist
- another active contract proves the row belongs to a different identity family

## Prize Pack Application

For generic Play! Pokemon stamped Prize Pack rows:

- once the exact printed-number canon owner is proven, `BASE_ROUTE_AMBIGUOUS`
  is closed
- the row then returns to the normal evidence gate
- if Prize Pack series evidence is still missing, the row becomes
  `WAIT / NO_SERIES_CONFIRMATION`
- if single-series evidence is later proven, the row may become
  `READY_FOR_WAREHOUSE`

Route repair does not itself supply missing Prize Pack evidence.

## Canon-Safe Interpretation

If a canon row currently looks like:

- `GV-PK-EVS-95 | Umbreon VMAX | 95 | variant_key=alt`

and same-name rows also exist at other numbers:

- `GV-PK-EVS-214 | Umbreon VMAX | 214 | variant_key=NULL`
- `GV-PK-EVS-215 | Umbreon VMAX | 215 | variant_key=alt`

then the row at `95` is still a lawful printed identity owner for printed number
`95`.

This rule does not claim the current `variant_key` labeling is perfect. It only
prevents route logic from treating that label as stronger than the printed
number.

## Result

After adoption of this rule:

- exact same-name same-number canon rows remain usable as base-route anchors
  even if `variant_key` is non-null
- differing printed numbers remain the primary separator for standalone printed
  identities
- Prize Pack and similar repair passes can move such rows out of
  `BASE_ROUTE_AMBIGUOUS` without guessing
