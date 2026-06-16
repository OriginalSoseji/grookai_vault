# Image Truth High Quality Probe Results V1

Generated: 2026-06-16T20:29:58.216Z

Mode: audit only. No DB writes. No image uploads. No migrations.

## Summary

- input queue rows: 17628
- probed rows: 17628
- verified available image rows: 13217
- blocked/unavailable rows: 4411
- concurrency: 40
- timeout ms: 10000

## Probe Status Counts

| status | rows |
| --- | ---: |
| verified_available_image | 13217 |
| blocked_unavailable_or_non_image | 4411 |

## Bucket Counts

| bucket | rows | verified |
| --- | ---: | ---: |
| parent_tcgdex_high_to_pokemontcg_hires_candidate | 17102 | 12834 |
| parent_missing_to_pokemontcg_hires_candidate | 317 | 175 |
| parent_tcgdex_non_high_to_tcgdex_high | 122 | 122 |
| parent_small_to_pokemontcg_hires | 87 | 86 |

## Safety

- db_writes_performed: false
- image_uploads_performed: false
- migrations_created: false
- parent_overwrites_performed: false
- child_image_exactness_changed: false

