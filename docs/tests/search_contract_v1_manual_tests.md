# SEARCH_CONTRACT_V1 Manual Tests

Run against Supabase (local or remote) after deploying `search_card_prints_v1`.

- Case A: query match vs legacy
  - `select count(*) from public.search_card_prints_v1('pikachu', null, null, 50, 0);`
  - `select count(*) from public.search_cards('pikachu');` (if legacy RPC exists)
  - Expectation: new RPC count >= legacy (or note legacy absent); results deterministic across repeats.

- Case B: number normalization padding
  - `select id, set_code, number from public.search_card_prints_v1(null, 'sv01', '043', 10, 0);`
  - `select id, set_code, number from public.search_card_prints_v1(null, 'sv01', '43', 10, 0);`
  - Expectation: same leading results (padded vs raw digits treated equivalently).

- Case C: slash parsing
  - `select id, set_code, number from public.search_card_prints_v1(null, 'sv01', '043/198', 10, 0);`
  - Expectation: matches Case B (digits before slash used).

- Case D: ordering stability
  - Run twice: `select id from public.search_card_prints_v1('charizard', null, null, 5, 0);`
  - Expectation: identical ordered ids across runs; order key = number priority, set match, name asc, id asc.
