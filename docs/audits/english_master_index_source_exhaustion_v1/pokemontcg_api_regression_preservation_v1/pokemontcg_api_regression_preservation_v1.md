# PokemonTCG API Regression Preservation V1

Audit only. No DB writes, migrations, cleanup, or quarantine were performed.

The guarded staging run for `bulbapedia_swsh11_trick_or_trade_stamps` exposed three baseline `pokemontcg_api` evidence rows that disappeared during the live rebuild. These preservation rows keep the original `pokemontcg_api` source key, so they restore prior evidence without creating a new independent source.

## Preserved Rows

| Set | Number | Card | Finish | Source URL |
| --- | ---: | --- | --- | --- |
| FireRed & LeafGreen | 113 | Charmander | normal | https://api.pokemontcg.io/v2/cards/ex6-113 |
| POP Series 8 | 6 | Cherrim | reverse | https://api.pokemontcg.io/v2/cards/pop8-6 |
| POP Series 8 | 7 | Carnivine | reverse | https://api.pokemontcg.io/v2/cards/pop8-7 |

## Invariant

PokemonTCG live evidence may add rows, but live availability must not delete or hide cached baseline PokemonTCG evidence.
