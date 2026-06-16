# ENRICH-24A Luxray Collision Cleanup Guarded Dry-Run V1

Package: `ENRICH-24A-LUXRAY-GL-LVX-COLLISION-CLEANUP`

## Result

- Pass: true
- Package fingerprint: `76d425f0d117ded96b6286cc51213a46d4dbd7439203e28fc887e90a5856a447`
- Dry-run proof: `be1e7c323cdf73feda0e5da4afaef7dbe6360b3413f834b2e5d5f7106355a841 == be1e7c323cdf73feda0e5da4afaef7dbe6360b3413f834b2e5d5f7106355a841`
- Stop findings: 0

## Evidence

| source | url | label |
| --- | --- | --- |
| official_pokemon | https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/pl2/109/ | Official Pokemon card page for series pl2 card 109 shows Luxray [GL] LV.X. |
| bulbapedia | https://bulbapedia.bulbagarden.net/wiki/Luxray_GL_LV.X_(Rising_Rivals_109) | Bulbapedia page identifies Rising Rivals 109 as Luxray GL LV.X. |
| pricecharting | https://www.pricecharting.com/game/pokemon-rising-rivals/luxray-gl-lvx-109 | PriceCharting product page identifies Pokemon Rising Rivals #109 as Luxray GL LV.X. |

## Simulated Scope

- External mapping transfers: 1
- Duplicate identity deletes: 1
- Trait transfers: 1
- Duplicate species deletes: 1
- Duplicate child printing deletes: 2
- Duplicate parent deletes: 1

## Safety

- Rollback-only dry-run: true
- Durable DB writes performed: false
- Canonical owner parent overwrite: false
- GV-ID writes: false
- Image writes: false
- Migrations created: false
- Global apply: false

## Stop Findings

_None._

## Approval Text If Accepted

```text
Approve real ENRICH-24A-LUXRAY-GL-LVX-COLLISION-CLEANUP apply only. Fingerprint: 76d425f0d117ded96b6286cc51213a46d4dbd7439203e28fc887e90a5856a447. Scope: 1 Luxray GL duplicate parent cleanup for tcgdex pl2-109; transfer 1 external mapping to canonical Luxray GL LV.X owner, delete 1 duplicate active identity, transfer 1 trait, delete 1 duplicate species mapping, delete 2 unsupported duplicate child printings, delete 1 duplicate parent. Dry-run proof: be1e7c323cdf73feda0e5da4afaef7dbe6360b3413f834b2e5d5f7106355a841 == be1e7c323cdf73feda0e5da4afaef7dbe6360b3413f834b2e5d5f7106355a841. No canonical owner parent overwrite. No GV-ID writes. No image writes. No migrations. No global apply.
```
