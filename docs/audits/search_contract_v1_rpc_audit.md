# SEARCH_CONTRACT_V1 RPC Audit

## Step 1 — Baseline object check (Supabase local)
- View `public.v_card_search` exists:
  ```
  Schema |     Name      | Type |  Owner   | Persistence |  Size   | Description
  --------+---------------+------+----------+-------------+---------+----------------------------------------------------------------------------------------------------------------------------------
  public | v_card_search | view | postgres | permanent   | 0 bytes | Stable app-facing search view. Guarantees image_best, image_url, thumb_url, number(+variants), and latest prices when available.
  ```

- Function `public.search_cards` missing (psql `\df+ public.search_cards` -> no rows; direct call fails):
  ```
  ERROR:  function search_cards(unknown) does not exist
  LINE 1: select count(*) from search_cards('pikachu');
                               ^
  HINT:  No function matches the given name and argument types. You might need to add explicit type casts.
  ```

- Table `public.card_prints` contains required columns:
  ```
  Column | Type | Nullable
  -------+------+----------
  id             | uuid                     | not null
  name           | text                     | not null
  set_code       | text                     |
  number         | text                     |
  ... (see \d+ public.card_prints)
  ```

## Step 3 — Verification runs (post-creation of search_card_prints_v1)
**Note:** `public.card_prints` is currently empty (`count(*) = 0`), so queries return zero rows but ordering/normalization paths still exercised.

- Case A (q='pikachu'): `select count(*) from public.search_card_prints_v1('pikachu', null, null, 50, 0);`
  ```
   count
  -------
       0
  ```
  Legacy comparison blocked because `public.search_cards` is missing (see Step 1).

- Case B (set_code_in='sv01'): number variants
  ```
  select id, set_code, number from public.search_card_prints_v1(null, 'sv01', '043', 10, 0);
   id | set_code | number
  ----+----------+--------
  (0 rows)

  select id, set_code, number from public.search_card_prints_v1(null, 'sv01', '43', 10, 0);
   id | set_code | number
  ----+----------+--------
  (0 rows)
  ```

- Case C (number_in='043/198'):
  ```
  select id, set_code, number from public.search_card_prints_v1(null, 'sv01', '043/198', 10, 0);
   id | set_code | number
  ----+----------+--------
  (0 rows)
  ```

- Ordering stability check (q='charizard', run twice, limit 5):
  ```
  id
  ----
  (0 rows)
  ---
  id
  ----
  (0 rows)
  ```
