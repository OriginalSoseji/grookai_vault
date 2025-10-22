-- Batch fetch card_prints by pairs of (set_code, number)
-- Usage: select * from public.get_prints_by_pairs('[{"set":"sv6","num":"001"}]'::jsonb);

create or replace function public.get_prints_by_pairs(pairs jsonb)
returns table(
  id uuid,
  set_code text,
  number text,
  name text,
  image_url text,
  image_alt_url text,
  name_local text,
  lang text
)
language sql
stable
as $$
  with j as (
    select
      lower(coalesce(p->>'set', p->>'set_code', p->>'setCode')) as set,
      lower(coalesce(p->>'num', p->>'number')) as num
    from jsonb_array_elements(coalesce(pairs, '[]'::jsonb)) as p
  )
  select
    cp.id, cp.set_code, cp.number, cp.name,
    cp.image_url, cp.image_alt_url, cp.name_local, cp.lang
  from public.card_prints cp
  join j on (cp.set_code = j.set and lower(cp.number) = j.num)
$$;

grant execute on function public.get_prints_by_pairs(jsonb) to authenticated;

