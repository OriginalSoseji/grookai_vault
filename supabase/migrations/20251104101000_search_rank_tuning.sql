-- Grookai Vault — Search rank tuning for short names (e.g., "pika" ≈ "pikachu")
create or replace function public.search_cards(q text, "limit" int default 50)
returns table(
  id uuid,
  name text,
  number text,
  set_code text,
  rarity text,
  supertype text,
  subtypes text[],
  score numeric
)
language sql
stable
as $$
  with
  cleaned as (
    select
      public.gv_norm_name(q) as q_name_norm,
      public.gv_num_int(q)   as q_num,
      public.gv_total_int(q) as q_total
  ),
  ranked as (
    select
      v.id, v.name, v.number, v.set_code, v.rarity, v.supertype, v.subtypes,
      v.number_int, v.total_int,
      (
        case when c.q_num is not null and v.number_int = c.q_num then 4 else 0 end
        + case when c.q_total is not null and v.total_int = c.q_total then 2 else 0 end
        + greatest(similarity(v.name_norm, c.q_name_norm) * 1.5, 0) -- boost partials like "pika"
      )::numeric as score
    from public.v_cards_search_v2 v
    cross join cleaned c
    where
      (c.q_num is not null and v.number_int = c.q_num)
      or (c.q_name_norm <> '' and v.name_norm % c.q_name_norm)
      or (c.q_total is not null and v.total_int = c.q_total)
  )
  select id, name, number, set_code, rarity, supertype, subtypes, score from ranked
  order by score desc, number_int asc nulls last
  limit greatest("limit", 1)
$$;
