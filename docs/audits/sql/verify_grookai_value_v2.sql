-- A. Bounds proof for V2
select count(*) as violations
from public.v_grookai_value_v2
where grookai_value_nm is not null
  and (
    grookai_value_nm < least(nm_floor, nm_median)
    or grookai_value_nm > greatest(nm_floor, nm_median)
  );

-- B. Null integrity proof
select count(*) as violations
from public.v_grookai_value_v2
where (nm_floor is null or nm_median is null)
  and grookai_value_nm is not null;

-- C. Effective floor sanity
select count(*) as violations
from public.v_grookai_value_v2
where effective_floor_nm is not null
  and nm_median is not null
  and effective_floor_nm > nm_median;

-- D. Weight sanity
select count(*) as violations
from public.v_grookai_value_v2
where
  (w_liquidity < 0 or w_liquidity > 1)
  or (w_spread < 0 or w_spread > 1)
  or (w_median < 0 or w_median > 1);

-- E. Distribution comparison
select
  count(*) as rows_compared,
  avg(v1_value) as avg_v1,
  avg(v2_value) as avg_v2,
  avg(v2_value - v1_value) as avg_delta
from public.v_grookai_value_compare_v1_v2
where v1_value is not null
  and v2_value is not null;

-- F. Wide-spread sample inspection
select *
from public.v_grookai_value_compare_v1_v2
where nm_floor is not null
  and nm_median is not null
  and nm_floor > 0
  and (nm_median / nm_floor) >= 2
order by (v2_value - v1_value) asc
limit 50;

-- G. Tight-market sample inspection
select *
from public.v_grookai_value_compare_v1_v2
where nm_floor is not null
  and nm_median is not null
  and nm_floor > 0
  and (nm_median / nm_floor) <= 1.15
order by abs(v2_value - nm_median) asc
limit 50;
