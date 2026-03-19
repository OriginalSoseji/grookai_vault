# RESOLVER STRESS TEST V1

Run command:

```powershell
node tools/resolver/resolver_stress_test_v1.mjs
```

## Resolver Audit Summary

- Search route entrypoint: `apps/web/src/app/search/route.ts` via `GET -> resolvePublicSearch(rawQuery)`
- Ranked result entrypoint: `apps/web/src/lib/explore/getExploreRows.ts` via `getExploreRows(rawQuery, sortMode, exactSetCode, exactReleaseYear, exactIllustrator)`
- Live caller for ranked results: `apps/web/src/components/explore/ExplorePageClient.tsx`
- Why this path was chosen: The harness calls both audited functions directly. resolvePublicSearch captures the live /search routing decision, and getExploreRows captures the live ranked result list. A runtime stub for @/lib/supabase/server is used only to replace Next cookie wiring; resolver logic and DB query behavior are unchanged.

## Run Summary

- Total queries: 26
- Avg latency: 17669.49 ms
- P95 latency: 25128.1 ms
- Zero-result queries: 0
- Flagged queries: 26
- Results file: `docs/audits/resolver_stress_test_v1_results.json`

Failure pattern counts:
- `slow_query`: 26
- `variant_token_missing_from_top`: 1

## Worst Queries

| Query | Resolver | Top result | Latency | Flags |
| ----- | -------- | --------- | ------: | ----- |
| `greninja gold star` | `explore` | `Ash-Greninja-EX • xyp • #XY133` | 25081.20 ms | `slow_query`, `variant_token_missing_from_top` |
| `lugia neo genesis` | `explore` | `Lugia • neo1 • #9` | 27560.12 ms | `slow_query` |
| `pikachu sv promo` | `explore` | `_____'s Pikachu • basep • #24` | 25128.10 ms | `slow_query` |
| `m rayquaza ex roaring skies` | `explore` | `M Rayquaza-EX • xy6 • #61` | 24590.21 ms | `slow_query` |
| `pikachu swsh020` | `explore` | `Pikachu • swshp • #SWSH020` | 22314.99 ms | `slow_query` |
| `charizard base` | `explore` | `Charizard • base1 • #4` | 21516.03 ms | `slow_query` |
| `gardevoir ex 245` | `explore` | `Gardevoir ex • sv01 • #245` | 21332.97 ms | `slow_query` |
| `eevee promo` | `explore` | `Eevee • bwp • #BW94` | 20881.14 ms | `slow_query` |
| `alakazam base set` | `explore` | `Alakazam • base1 • #1` | 19691.72 ms | `slow_query` |
| `rayquaza gx rainbow` | `explore` | `Rayquaza VMAX • swsh7 • #217` | 19328.96 ms | `slow_query` |
| `professor's research swsh152` | `explore` | `Professor's Research • swshp • #SWSH152` | 19183.49 ms | `slow_query` |
| `gyarados holo base` | `explore` | `Gyarados • base1 • #6` | 19075.42 ms | `slow_query` |

## Latency Breakdown

- Average total latency: 17669.49 ms
- Average DB latency: 371.78 ms (2.1%)
- Average network latency: 17289.22 ms (97.85%)
- Average application latency: 7.89 ms (0.04%)
- Average normalization latency: 0.24 ms
- Average post-processing latency: 7.65 ms

## Bottleneck Classification

- Classification: network-bound
- Basis: averaged query latency is estimated per stage using stage wall-clock time plus Supabase upstream service-time headers. DB time reflects the upstream service share of each remote stage, network time reflects the remaining round-trip overhead, and app time reflects local normalization, mapping, and sorting work.

## Pattern Summary

- variant token handling weak: 1 query flagged

## Next-Fix Recommendations

1. Promote variant and finish tokens such as alt art, rainbow, holo, and gold in ranking inputs instead of relying on name matches alone. Evidence: 1 query matched `variant token handling weak`.

## Quality Pass V1 Impact

- Baseline source: `docs/audits/resolver_stress_test_v1_results.json` loaded before this run.
- Flagged queries: 26 -> 26 (no change)
- `number_token_missing_from_top`: 2 -> 0 (-2)
- `set_token_missing_from_top`: 2 -> 0 (-2)
- `variant_token_missing_from_top`: 3 -> 1 (-2)
- `name_mismatch_top_result`: 1 -> 0 (-1)

Representative improvements:
- `rayquaza gx rainbow`: `Rayquaza VMAX • swsh7 • #217` -> `Rayquaza VMAX • swsh7 • #217`
  Flags: `slow_query`, `variant_token_missing_from_top` -> `slow_query`
- `umbreon vmax alt art`: `Umbreon VMAX • swsh7 • #95` -> `Umbreon VMAX • swsh7 • #95`
  Flags: `slow_query`, `variant_token_missing_from_top` -> `slow_query`

