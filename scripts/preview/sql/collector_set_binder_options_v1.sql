-- Isolated candidate only. Public raw authority stays inaccessible.
create or replace function public.binder_set_options_v1(p_query text default '')
returns table(set_id uuid, name text, code text, slot_count integer)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select s.id, s.name::text, s.code::text, a.n::integer
  from public.binder_set_slot_pointers_v1 p
  join public.sets s on s.id=p.set_id
  cross join lateral (select count(*) n from public.binder_set_slots_authority_v1(s.id)) a
  where auth.uid() is not null and a.n>0
    and length(coalesce(p_query,''))<=60
    and (coalesce(p_query,'')='' or strpos(lower(s.name),lower(p_query))>0)
  order by s.release_date desc nulls last,s.id
  limit 40;
$$;
revoke all on function public.binder_set_options_v1(text) from public, anon;
grant execute on function public.binder_set_options_v1(text) to authenticated,service_role;
