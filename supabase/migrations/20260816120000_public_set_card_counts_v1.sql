-- PUBLIC_SET_CARD_COUNTS_V1
-- Returns bounded, release-aware parent-card counts for exact set codes.

begin;

create or replace function public.get_public_set_card_counts_v1(
  p_set_codes text[]
)
returns table (
  set_code text,
  card_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if p_set_codes is null or cardinality(p_set_codes) = 0 then
    return;
  end if;

  if cardinality(p_set_codes) > 1000 then
    raise exception 'get_public_set_card_counts_v1 accepts at most 1000 set codes';
  end if;

  return query
  select
    card.set_code,
    count(*)::bigint
  from public.card_prints card
  join public.games game
    on game.id = card.game_id
  where card.set_code = any(p_set_codes)
    and card.gv_id is not null
    and public.catalog_game_visible_to_request_v1(game.code)
  group by card.set_code
  order by card.set_code;
end;
$function$;

revoke all on function public.get_public_set_card_counts_v1(text[])
from public, anon, authenticated, service_role;
grant execute on function public.get_public_set_card_counts_v1(text[])
to anon, authenticated, service_role;

comment on function public.get_public_set_card_counts_v1(text[]) is
'Bounded release-aware parent-card counts for exact set codes. Set visibility is enforced inside the SECURITY DEFINER boundary.';

notify pgrst, 'reload schema';

commit;
