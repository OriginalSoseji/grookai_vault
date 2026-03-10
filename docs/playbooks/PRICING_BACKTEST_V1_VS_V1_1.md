Purpose: compare v1 vs v1.1 deltas without switching consumers.

Required queries:

Bounds proof for v1.1 (must be 0):

```sql
select count(*) as violations
from public.v_grookai_value_v1_1
where grookai_value_nm is not null
  and (
    grookai_value_nm < least(effective_floor_nm, nm_median)
    or grookai_value_nm > greatest(effective_floor_nm, nm_median)
  );
```

Distribution delta sample:

```sql
select
  count(*) as rows_total,
  count(*) filter (where v1.grookai_value_nm is not null and v11.grookai_value_nm is not null) as both_priced,
  avg(v11.grookai_value_nm - v1.grookai_value_nm) as avg_delta,
  percentile_cont(0.5) within group (order by (v11.grookai_value_nm - v1.grookai_value_nm)) as median_delta
from public.v_grookai_value_v1 v1
join public.v_grookai_value_v1_1 v11
  on v11.card_print_id = v1.card_print_id;
```

Spot-check largest deltas:

```sql
select
  v1.card_print_id,
  v1.nm_floor,
  v1.nm_median,
  v1.listing_count,
  v1.grookai_value_nm as gv_v1,
  v11.effective_floor_nm,
  v11.grookai_value_nm as gv_v1_1,
  (v11.grookai_value_nm - v1.grookai_value_nm) as delta
from public.v_grookai_value_v1 v1
join public.v_grookai_value_v1_1 v11
  on v11.card_print_id = v1.card_print_id
where v1.grookai_value_nm is not null and v11.grookai_value_nm is not null
order by delta desc
limit 50;
```
