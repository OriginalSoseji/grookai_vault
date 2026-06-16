# Image Truth V1 MEP Cosmos Source Evidence

This is an audit-only evidence packet for MEP image blockers where the current child printing target is `finish_key=holo`, but external source labels identify the card as `Cosmos Holo`.

No DB writes, storage uploads, migrations, cleanup, quarantine, or parent image overwrites were performed.

## Rule

Do not image-fill a child printing when the source evidence says `Cosmos Holo` but the current target child finish is `holo`. Finish governance must resolve the child printing first.

## Rows

| set | number | card | current finish | source-supported label | evidence |
| --- | --- | --- | --- | --- | --- |
| mep | 018 | Cottonee | holo | Cosmos Holo | TCGplayer product; GameNerdz product |
| mep | 019 | Whimsicott | holo | Cosmos Holo | TCGplayer product; Full Grip Games product |
| mep | 020 | Sneasel | holo | Cosmos Holo | TCGplayer product; TCGplayerPro catalog |
| mep | 021 | Weavile | holo | Cosmos Holo | TCGplayer product; Noble Knight product |
| mep | 069 | Chikorita | holo | Cosmos Holo | TCGplayer product; PokeScope card page |

## Decision

These rows should not be handled by an image package against the existing `holo` child printing. They need a finish governance package first, likely converting or splitting toward `cosmos` only if the Master Index and DB reconciliation rules approve it.
