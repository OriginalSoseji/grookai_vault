-- Search reads retain caller RLS. No catalog, ownership or release-policy writes.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '60s';

create index if not exists card_prints_artist_id_search_v1
  on public.card_prints (artist, id) where artist is not null;
-- lower(code) is not leakproof, so an expression index cannot move ahead of
-- the RLS barrier. Store the derived key; plain text equality can use its index
-- while the original visibility policy still checks every matching row.
alter table public.sets add column if not exists search_code_lower text
  generated always as (lower(code)) stored;
create index if not exists sets_code_lower_search_v1
  on public.sets (search_code_lower);

-- JSON avoids PostgREST's row cap without silently truncating set interpretation.
-- This is deliberately invoker security: each call uses current release visibility.
create or replace function public.get_search_set_catalog_v1(game_code_in text)
returns jsonb language sql stable security invoker set search_path = public
as $function$
  select jsonb_build_object(
    'complete', count(*) <= 20000,
    'sets', coalesce(jsonb_agg(to_jsonb(s) order by s.id), '[]'::jsonb)
  )
  from (
    select id, code, name, printed_set_abbrev, printed_total, release_date, identity_model
    from public.sets
    where game = lower(trim(game_code_in))
    order by id limit 20001
  ) s;
$function$;

-- Match the old literal, case-insensitive lookup using an indexed expression.
create or replace function public.resolve_visible_set_references_v1(
  code_in text, game_code_in text default null
)
returns table(id uuid, code text)
language sql stable security invoker set search_path = public
as $function$
  select s.id, s.code from public.sets s
  where s.search_code_lower = lower(trim(code_in))
    and (nullif(lower(trim(game_code_in)), '') is null
      or s.game = lower(trim(game_code_in)))
  order by s.id;
$function$;

revoke all on function public.get_search_set_catalog_v1(text) from public;
revoke all on function public.resolve_visible_set_references_v1(text,text) from public;
grant execute on function public.get_search_set_catalog_v1(text) to anon, authenticated, service_role;
grant execute on function public.resolve_visible_set_references_v1(text,text) to anon, authenticated, service_role;
commit;
