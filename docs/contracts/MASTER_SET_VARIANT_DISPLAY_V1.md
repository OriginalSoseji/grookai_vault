# MASTER_SET_VARIANT_DISPLAY_V1

Status: DRAFT IMPLEMENTED

Scope: display labels only. This contract does not introduce master-set counting, migrations, DB writes, scanner changes, or public Grookai Dex enablement.

## Purpose

Grookai must distinguish cards that look duplicated when only name, set, number, and rarity are shown. The display layer must expose the distinction without changing Species Dex completion math.

## Inputs

- `MASTER_SET_VARIANT_CONTRACT_V1`
- `GROOKAI_DEX_V1`
- `finish_keys`
- `card_printings`
- `premium_parallel_eligibility`
- `card_prints.variant_key`
- `card_prints.printed_identity_modifier`

## Helper Contract

Reusable helpers:

- `getCardPrintDisplayDiscriminator()`
- `getCardPrintingFinishLabel()`
- `getVariantDisplayLabel()`

Required precedence:

1. special parent variant label from `variant_key`
2. child printing finish label from `finish_keys` / `card_printings`
3. printed identity modifier label from `printed_identity_modifier`
4. fallback discriminator for duplicate-looking parent rows

## Labels

Stable finish labels:

- `normal`: Normal
- `holo`: Holo
- `reverse`: Reverse Holo
- `pokeball`: Poké Ball
- `masterball`: Master Ball

Stable parent / modifier labels:

- `pokemon_together_stamp`: Pokemon Together Stamp
- `prerelease_stamp`: Prerelease Stamp
- `staff_prerelease_stamp`: Staff Prerelease Stamp
- `play_pokemon_stamp`: Play Pokemon Stamp
- `delta_species`: Delta Species

Fallback labels:

- Standard Print
- Unclassified Variant

## Species Dex Rule

Species Dex remains parent-print based:

```text
distinct active card_print_species.card_print_id
where counts_for_completion = true
```

Child finishes may be displayed as card-printing context, but they must not multiply Species Dex denominators.

## UI Rule

Any card tile that participates in a duplicate-looking group must show a compact discriminator label. Public safe card surfaces may show the same label as a badge, subtitle, or chip.

## Non-Goals

- no full master-set completion
- no denominator expansion
- no schema migration
- no public feature enablement
- no scanner work
