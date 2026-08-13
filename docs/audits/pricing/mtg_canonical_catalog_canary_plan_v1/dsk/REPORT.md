# MTG Canonical Catalog One-Set Canary Plan

- Plan: `MTG_CANONICAL_CATALOG_CANARY_PLAN_V1`
- Producing commit: `64a2b627cb76072c2e1910510e4035f7caf45a67`
- Branch: `agent/mtg-pricing-readiness-v1`
- Set: **Duskmourn: House of Horror** (`dsk`)
- Writer payload fingerprint: `83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7`
- Staging migration SHA-256: `20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8`
- Foundation migration SHA-256: `d4085f0dab4c9d5724dcda5644b1774ab48bb3535f94b42f0ca3cea1786de082`
- Database writes performed: `0`

## Rows

| Table | Planned rows |
|---|---:|
| sets | 1 |
| card_prints | 417 |
| card_print_identity | 417 |
| card_printings | 807 |
| external_mappings | 417 |
| external_printing_mappings | 807 |
| exact_market_lanes | 807 |
| positive_market_lanes | 807 |
| quarantined_collision_lanes | 0 |

## Boundaries

This is an artifacts-only plan. Its first durable target is the service-only MTG import staging layer. It does not apply either migration, write canonical rows, upload images, update image pointers, publish prices, expose MTG in clients, or mutate Pokemon data.
