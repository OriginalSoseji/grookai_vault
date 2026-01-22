-- SEARCH_CONTRACT_V1: deterministic card print search RPC (non-breaking)
create or replace function public.search_card_prints_v1(
  q text default null,
  set_code_in text default null,
  number_in text default null,
  limit_in int default 50,
  offset_in int default 0
) returns setof public.v_card_search
language sql
stable
security definer
set search_path to 'public'
as $$
  with normalized as (
    select
      nullif(trim(q), '') as q_norm,
      nullif(trim(lower(set_code_in)), '') as set_code_norm,
      nullif((regexp_match(coalesce(trim(number_in), ''), '(\d+)'))[1], '') as num_digits
  ),
  prepared as (
    select
      q_norm,
      set_code_norm,
      num_digits,
      case when num_digits is null then null else lpad(num_digits, 3, '0') end as num_padded,
      case when num_digits ~ '^\d+$' then num_digits::int else null end as num_int
    from normalized
  )
  select v.*
  from public.v_card_search v
  cross join prepared p
  where
    (p.set_code_norm is null or lower(v.set_code) = p.set_code_norm)
    and (
      p.num_digits is null
      or v.number_digits = p.num_digits
      or v.number_padded = p.num_padded
      or (v.number_slashed is not null and v.number_slashed like p.num_padded || '/%')
    )
    and (
      p.q_norm is null or v.name ilike '%' || p.q_norm || '%'
    )
  order by
    case
      when p.num_digits is not null and v.number_digits = p.num_digits then 0
      when p.num_digits is not null and v.number_padded = p.num_padded then 1
      when p.num_digits is not null and v.number_slashed like p.num_padded || '/%' then 2
      else 3
    end,
    case when p.set_code_norm is not null and lower(v.set_code) = p.set_code_norm then 0 else 1 end,
    v.name asc,
    v.id asc
  limit greatest(1, coalesce(limit_in, 50))
  offset greatest(0, coalesce(offset_in, 0));
$$;

grant execute on function public.search_card_prints_v1(
  q text,
  set_code_in text,
  number_in text,
  limit_in int,
  offset_in int
) to anon, authenticated, service_role;
