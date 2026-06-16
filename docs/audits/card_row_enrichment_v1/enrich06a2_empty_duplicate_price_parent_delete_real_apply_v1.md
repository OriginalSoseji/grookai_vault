# ENRICH-06A2 Empty Duplicate Price Parent Delete Real Apply V1

Package: `ENRICH-06A2-EMPTY-DUPLICATE-PRICE-PARENT-DELETE`

## Result

- Pass: true
- Target rows: 940
- Deleted parent rows: 940
- Direct active price deletes: 0
- Active price view rows accepted as derived: 940
- Remaining target parent rows: 0
- Package fingerprint: `da0c9a329af530b55a168069d81f6501060635250b248fa64bbaa0afef3d23d0`
- Dry-run proof: `d6e27098cabfb362bf5cbc5579fed4e4f44300b9941a9928a85bb83006fa97e9 == d6e27098cabfb362bf5cbc5579fed4e4f44300b9941a9928a85bb83006fa97e9`

## Safety

- Durable DB writes performed: true
- Writes performed: `card_prints` deletes only
- Child deletes: false
- Identity deletes: false
- Mapping deletes: false
- Trait/species deletes: false
- Price table deletes: false
- Cameo deletes: false
- Merges: false
- Migrations created: false
- Image writes: false
- Global apply: false

## By Set

| set_code | rows |
| --- | --- |
| gym1 | 132 |
| gym2 | 132 |
| neo4 | 113 |
| neo1 | 111 |
| base1 | 102 |
| base5 | 83 |
| neo2 | 75 |
| neo3 | 66 |
| base2 | 64 |
| base3 | 62 |

## Stop Findings

_None._
