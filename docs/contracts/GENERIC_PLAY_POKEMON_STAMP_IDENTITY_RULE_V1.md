# GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1

Status: ACTIVE
Type: Printed Identity Rule Extension
Scope: `OFFICIAL_SINGLE_SERIES_CONFIRMED` Prize Pack family-only rows with a confirmed Play! Pokemon stamp and no printed series marker

## Purpose

Some Prize Pack rows are proven by first-party evidence to carry a Play! Pokemon
stamp, but the card does not print a `Prize Pack Series N` marker on the card
face. In those cases, the stamped identity is real, but the series membership is
distribution evidence rather than printed identity.

This rule allows those rows to become canonical stamped variants without
splitting identity by checklist series.

## Identity Basis

The canonical stamped identity is:

- the unique underlying base canonical row
- plus deterministic `variant_key = play_pokemon_stamp`

The canonical identity tuple is:

- routed base `set_code`
- printed number
- `variant_key = play_pokemon_stamp`

Series evidence may prove that the stamped row exists, but it must not create a
separate canonical identity when the card itself does not print the series.

## Inclusion

A Prize Pack family-only row is eligible under this rule only when all of the
following are true:

1. the row is externally documented as carrying a Play! Pokemon stamp
2. the row resolves to exactly one underlying base canonical row
3. the card does not print an explicit `Prize Pack Series N` marker
4. the evidence reduces to exactly one known series for that row
5. no more specific printed-identity rule applies

## Exclusion

This rule does not activate for:

- rows with an explicit `Prize Pack Series N` marker
- rows documented across multiple Prize Pack series with no row-level printed
  series distinction
- rows that only have family membership evidence but no confirmed stamped proof
- rows whose underlying base route is ambiguous or missing

Those rows remain outside the ready queue or remain `DO_NOT_CANON` according to
the evidence checkpoint.

## Warehouse Representation

Rows governed by this rule must preserve:

- base printed name unchanged
- base printed number unchanged
- routed base `set_code` unchanged
- `variant_key = play_pokemon_stamp`
- `variant_identity_rule = GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`

The system must not:

- synthesize series-based numbering
- append series identifiers into `variant_key`
- create one canonical row per checklist series

## Validation Boundary

For the `OFFICIAL_SINGLE_SERIES_CONFIRMED` subset identified in
`prize_pack_evidence_v1`, this rule is valid only when:

- the routed base `set_code` is deterministic for every row
- all rows resolve to deterministic canonical targets
- no target depends on series splitting
- duplicate-reprint rows remain excluded
- wait-for-more-evidence rows remain excluded

## Result

Prize Pack family-only rows with a confirmed generic Play! Pokemon stamp may
enter the stamped warehouse pipeline as a single stamped identity per unique base
card, using `variant_key = play_pokemon_stamp`.
