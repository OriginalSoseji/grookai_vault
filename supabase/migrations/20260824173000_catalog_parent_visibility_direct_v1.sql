-- CATALOG_PARENT_VISIBILITY_DIRECT_V1
-- Preserve the fail-closed release truth while resolving it in one query.

begin;

create or replace function public.catalog_parent_gv_id_visible_to_request_v1(
  p_parent_gv_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when lower(coalesce(game.code, '')) = 'pokemon' then true
        when control.release_status = 'public' then true
        when control.release_status = 'signed_in'
          and coalesce(auth.role(), '') in ('authenticated', 'service_role')
          then true
        else false
      end
      from public.card_prints card
      join public.games game on game.id = card.game_id
      left join public.catalog_game_release_controls control
        on lower(control.game_code) = lower(game.code)
      where card.gv_id = p_parent_gv_id
    ),
    false
  );
$$;

comment on function public.catalog_parent_gv_id_visible_to_request_v1(text) is
  'CATALOG_PARENT_VISIBILITY_DIRECT_V1. Equivalent fail-closed Pokemon/public/signed-in release rule resolved without nested helper calls.';

revoke all on function public.catalog_parent_gv_id_visible_to_request_v1(text)
  from public;

grant execute on function public.catalog_parent_gv_id_visible_to_request_v1(text)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
