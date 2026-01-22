# SEARCH_CONTRACT_V1 Manual Tests

Run against Supabase after deploying `search_card_prints_v1`.

- Number padding equivalence
  - `select id, set_code, number from public.search_card_prints_v1(null, 'sv01', '043', 10, 0);`
  - `select id, set_code, number from public.search_card_prints_v1(null, 'sv01', '43', 10, 0);`
  - Expect: same leading rows (padded vs raw digits treated equally).

- Slash parsing equivalence
  - `select id, set_code, number from public.search_card_prints_v1(null, 'sv01', '043/198', 10, 0);`
  - Expect: same as padding case (digits before slash used).

- Ordering stability
  - Run twice: `select id from public.search_card_prints_v1('charizard', null, null, 5, 0);`
  - Expect: identical ordered ids across runs (order: number match, set match, name asc, id asc).

- Legacy search intact
  - `select count(*) from public.search_cards('pikachu');` (if present)
  - Expect: legacy callable; counts may differ but function untouched.
