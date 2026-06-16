# ENRICH-10 PokemonTCG Snapshot Rarity Real Apply V1

Package: `ENRICH-10-POKEMONTCG-SNAPSHOT-RARITY-BACKFILL`

## Result

- Pass: true
- Target parent rows: 26
- Updated parent rows: 26
- Package fingerprint: `374dde70fa829a159a61041193445e16b857e50d7aa8ec557115ff983d58ac40`
- Dry-run proof: `07f25c3238ade95521a13ec0c00ac5ae1f2029058dab24565348b1bb2f3b9f1e == 07f25c3238ade95521a13ec0c00ac5ae1f2029058dab24565348b1bb2f3b9f1e`

## Safety

- Durable DB writes performed: true
- Writes performed: `card_prints.rarity` null-only updates
- Non-null overwrites: false
- Artist/regulation_mark/variants writes: false
- Child/identity/external mapping/species writes: false
- Deletes/merges: false
- Migrations created: false
- Image writes: false
- Global apply: false

## By Set

| set_code | rows |
| --- | --- |
| bw11 | 20 |
| col1 | 3 |
| bwp | 2 |
| svp | 1 |

## Stop Findings

_None._
