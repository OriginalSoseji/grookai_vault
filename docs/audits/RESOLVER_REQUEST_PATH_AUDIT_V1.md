# RESOLVER REQUEST PATH AUDIT V1

Run command:

```powershell
node tools/resolver/resolver_stress_test_v1.mjs
```

## Request Path Summary

- Primary public search form: `apps/web/src/components/PublicSearchForm.tsx` via `handleSubmit -> buildPublicSearchDestination -> router.push(nextUrl)`
- Structured query route: `apps/web/src/app/search/route.ts` via `GET(request) -> auth.getUser -> trackServerEvent -> resolvePublicSearch`
- Ranked results path: `apps/web/src/components/explore/ExplorePageClient.tsx` via `useEffect -> getExploreRows(normalizedQuery, sortMode, exactSetCode, exactReleaseYear, exactIllustrator)`
- Relationship: publicSearchResolver.ts and getExploreRows.ts remain separate surfaces, but the collapsed client path now treats /explore as the authoritative results surface. /search is reserved for direct-resolution candidates that are likely to terminate on card/set redirects.
- Browser/bootstrap note: ExplorePageClient is a client component, so real browser use includes client navigation and bootstrap before the getExploreRows server call. This audit measures server/request path behavior only, not browser hydration time.

## Request Count Summary

- Average request count per end-to-end product query: 17.88
- Min request count: 7
- Max request count: 62
- Total requests across end-to-end product flow run: 465

## Request Shape Summary

- Single-call: 0
- Serial multi-call: 0
- Parallel multi-call: 0
- Mixed: 26

## Latency By Path

| Mode | Avg Total | Avg Network | Avg DB | Avg Request Count |
| ---- | --------: | ----------: | -----: | ----------------: |
| `direct_resolver` | 14386.93 ms | 14098.21 ms | 288.32 ms | 40.77 |
| `product_search_route` | 15401.88 ms | 12093.42 ms | 245.38 ms | 41.77 |
| `explore_results` | 3282.56 ms | 3191.01 ms | 83.45 ms | 11.50 |
| `product_search_to_explore` | 6036.53 ms | 5300.00 ms | 122.46 ms | 17.88 |

The explore results mode is already the live product data path for /explore. There is no second server-side wrapper in the repo beyond the client component bootstrap that triggers it.

## Worst Queries By Request Overhead

| Query | Total ms | Request Count | Shape | Key Request Types |
| ----- | -------: | ------------: | ----- | ----------------- |
| `professor's research swsh152` | 24905.64 ms | 62 | `mixed` | `telemetry_insert`, `sets_lookup`, `card_prints_lookup`, `supabase_rpc_search`, `tcgdex_sets_lookup`, `tcgdex_cards_lookup`, `pricing_metadata_lookup`, `pricing_view_lookup` |
| `pikachu promo swsh020` | 19087.99 ms | 58 | `mixed` | `telemetry_insert`, `card_prints_lookup`, `sets_lookup`, `supabase_rpc_search`, `tcgdex_sets_lookup`, `tcgdex_cards_lookup`, `pricing_metadata_lookup`, `pricing_view_lookup` |
| `pikachu swsh020` | 18611.75 ms | 58 | `mixed` | `telemetry_insert`, `sets_lookup`, `card_prints_lookup`, `supabase_rpc_search`, `tcgdex_sets_lookup`, `tcgdex_cards_lookup`, `pricing_metadata_lookup`, `pricing_view_lookup` |
| `charizard 4/102` | 12167.85 ms | 24 | `mixed` | `telemetry_insert`, `card_prints_lookup`, `sets_lookup` |
| `charizard   base set   4` | 8687.47 ms | 24 | `mixed` | `telemetry_insert`, `card_prints_lookup`, `sets_lookup` |
| `blastoise 2/102` | 8345.71 ms | 24 | `mixed` | `telemetry_insert`, `card_prints_lookup`, `sets_lookup` |
| `charizard ex obsidian flames 223` | 2835.80 ms | 17 | `mixed` | `supabase_rpc_search`, `tcgdex_sets_lookup`, `tcgdex_cards_lookup`, `card_prints_lookup`, `sets_lookup`, `pricing_metadata_lookup`, `pricing_view_lookup` |
| `charizard ex obsidian flames #223` | 2108.17 ms | 17 | `mixed` | `supabase_rpc_search`, `tcgdex_sets_lookup`, `tcgdex_cards_lookup`, `card_prints_lookup`, `sets_lookup`, `pricing_metadata_lookup`, `pricing_view_lookup` |
| `larry's skill 139` | 2553.73 ms | 15 | `mixed` | `supabase_rpc_search`, `tcgdex_sets_lookup`, `tcgdex_cards_lookup`, `card_prints_lookup`, `sets_lookup`, `pricing_metadata_lookup`, `pricing_view_lookup` |
| `greninja gold star` | 6610.13 ms | 12 | `mixed` | `supabase_rpc_search`, `tcgdex_sets_lookup`, `tcgdex_cards_lookup`, `card_prints_lookup`, `sets_lookup`, `pricing_metadata_lookup`, `pricing_view_lookup` |
| `m rayquaza ex roaring skies` | 6225.82 ms | 12 | `mixed` | `supabase_rpc_search`, `tcgdex_sets_lookup`, `tcgdex_cards_lookup`, `card_prints_lookup`, `sets_lookup`, `pricing_view_lookup`, `pricing_metadata_lookup` |
| `lugia neo genesis` | 2551.81 ms | 12 | `mixed` | `supabase_rpc_search`, `tcgdex_sets_lookup`, `tcgdex_cards_lookup`, `card_prints_lookup`, `sets_lookup`, `pricing_metadata_lookup`, `pricing_view_lookup` |

## Bottleneck Interpretation

- The evidence does not point to heavy local processing. App-side timing stays near zero while request-heavy modes dominate latency.
- The repo has two separate live surfaces for search: `/search` resolves redirect intent, and `/explore` loads ranked rows. They are not duplicated inside one helper, but a user flow can still pay both surfaces serially.
- The explore results path is the main request-heavy surface. It performs multiple Supabase RPC and REST calls, with parallelism inside some stages but still high round-trip cost overall.
- This audit does not capture browser hydration or client bootstrap before the explore request starts. That must be measured in a browser if product UX still feels slower than server timings alone.

## Ranked Next Actions

1. Avoid routing a query through both live surfaces unless redirect intent is genuinely needed. Structured queries that land on /explore pay /search route overhead first and then pay the explore results path separately.
2. Prioritize round-trip consolidation inside the explore results path before touching local scoring. The request audit shows many remote calls while local app-side work remains minimal.
3. Measure a real browser session next if UX still feels slower than these numbers. Explore results originate from a client component, so hydration/navigation delay is outside this server/request audit.

