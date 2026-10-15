# Pricing Checkpoint 145: Black and White Promos Alias Batch

Date: 2026-10-15

## Admitted scope

This batch admits exactly two TCGPlayer products from source group 1407, `Black and White Promos`:

- `84983` — `Druddigon (Team Plasma) - BW80` → `GV-PK-PR-BLW-BW80` → `GV-PK-PR-BLW-BW80-HOLO`
- `88646` — `Rayquaza EX -BW47` → `GV-PK-PR-BLW-BW47` → `GV-PK-PR-BLW-BW47-HOLO`

Both targets have one active standard parent identity and a unique existing Holo printing. The checked-in English Master Index records each card as `master_verified` with four sources and each Holo printing as `master_verified` with two sources.

## Held scope

Ten Victory Cup products remain held. Multiple products collide on BW29, BW30, and BW31 while their source titles encode different years, seasons, and placements. Those distinctions need separate canonical identity evidence and are outside this batch.

## Release boundary

The registry and authority builder make no database writes. Production work remains two bounded operations from the exact merged commit:

1. Insert verified, visible truth reviews for the two existing Holo printings.
2. Build and apply the exact two-row TCGPlayer mapping package, followed by independent readback and pricing coverage verification.

No Victory Cup mapping, broad name-normalization rule, parent mutation, or printing mutation is authorized by this checkpoint.

The full-scope coverage audit also accepts a bounded `--statement-timeout-ms`
override from 30 seconds through 15 minutes. The default remains three minutes;
the larger explicit bound is for production snapshots that have outgrown the
default without weakening either coverage requirement.
