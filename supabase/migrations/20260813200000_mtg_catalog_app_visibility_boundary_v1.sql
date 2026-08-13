-- MTG_CATALOG_APP_VISIBILITY_BOUNDARY_V1
-- Non-Pokemon catalog rows fail closed until an explicit release is active.

begin;

create table if not exists public.catalog_game_release_controls (
  game_code text primary key references public.games(code) on delete restrict,
  release_status text not null default 'hidden'
    check (release_status in ('hidden', 'signed_in', 'public')),
  release_version text not null,
  evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence) = 'object'),
  activated_at timestamptz null,
  activated_by text null,
  updated_at timestamptz not null default now()
);

comment on table public.catalog_game_release_controls is
  'Service-owned release boundary for non-Pokemon canonical catalogs. Absence or hidden status denies app visibility.';

alter table public.catalog_game_release_controls enable row level security;

revoke all on table public.catalog_game_release_controls from public, anon, authenticated;
grant select, insert, update on table public.catalog_game_release_controls to service_role;

drop policy if exists catalog_game_release_controls_service_v1
on public.catalog_game_release_controls;

create policy catalog_game_release_controls_service_v1
on public.catalog_game_release_controls
for all
to service_role
using (true)
with check (true);

insert into public.catalog_game_release_controls (
  game_code,
  release_status,
  release_version,
  evidence
)
values (
  'mtg',
  'hidden',
  'MTG_CATALOG_APP_VISIBILITY_BOUNDARY_V1',
  jsonb_build_object(
    'default', 'fail_closed',
    'canonical_promotion_authorizes_visibility', false,
    'price_publication_authorizes_visibility', false
  )
)
on conflict (game_code) do nothing;

create or replace function public.catalog_game_visible_to_request_v1(p_game_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when lower(coalesce(p_game_code, '')) = 'pokemon' then true
    when lower(coalesce(p_game_code, '')) = '' then false
    else exists (
      select 1
      from public.catalog_game_release_controls control
      where lower(control.game_code) = lower(p_game_code)
        and (
          control.release_status = 'public'
          or (
            control.release_status = 'signed_in'
            and coalesce(auth.role(), '') in ('authenticated', 'service_role')
          )
        )
    )
  end;
$$;

create or replace function public.catalog_game_id_visible_to_request_v1(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select public.catalog_game_visible_to_request_v1(game.code)
      from public.games game
      where game.id = p_game_id
    ),
    false
  );
$$;

create or replace function public.catalog_card_print_visible_to_request_v1(p_card_print_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select public.catalog_game_id_visible_to_request_v1(card.game_id)
      from public.card_prints card
      where card.id = p_card_print_id
    ),
    false
  );
$$;

create or replace function public.catalog_parent_gv_id_visible_to_request_v1(p_parent_gv_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select public.catalog_game_id_visible_to_request_v1(card.game_id)
      from public.card_prints card
      where card.gv_id = p_parent_gv_id
    ),
    false
  );
$$;

revoke all on function public.catalog_game_visible_to_request_v1(text) from public;
revoke all on function public.catalog_game_id_visible_to_request_v1(uuid) from public;
revoke all on function public.catalog_card_print_visible_to_request_v1(uuid) from public;
revoke all on function public.catalog_parent_gv_id_visible_to_request_v1(text) from public;

grant execute on function public.catalog_game_visible_to_request_v1(text)
  to anon, authenticated, service_role;
grant execute on function public.catalog_game_id_visible_to_request_v1(uuid)
  to anon, authenticated, service_role;
grant execute on function public.catalog_card_print_visible_to_request_v1(uuid)
  to anon, authenticated, service_role;
grant execute on function public.catalog_parent_gv_id_visible_to_request_v1(text)
  to anon, authenticated, service_role;

drop policy if exists games_catalog_release_visibility_v1 on public.games;
create policy games_catalog_release_visibility_v1
on public.games
as restrictive
for select
to public
using (public.catalog_game_visible_to_request_v1(code));

drop policy if exists sets_catalog_release_visibility_v1 on public.sets;
create policy sets_catalog_release_visibility_v1
on public.sets
as restrictive
for select
to public
using (public.catalog_game_visible_to_request_v1(game));

drop policy if exists card_prints_catalog_release_visibility_v1 on public.card_prints;
create policy card_prints_catalog_release_visibility_v1
on public.card_prints
as restrictive
for select
to public
using (public.catalog_game_id_visible_to_request_v1(game_id));

drop policy if exists card_print_identity_catalog_release_visibility_v1
on public.card_print_identity;
create policy card_print_identity_catalog_release_visibility_v1
on public.card_print_identity
as restrictive
for select
to public
using (public.catalog_card_print_visible_to_request_v1(card_print_id));

drop policy if exists card_printings_catalog_release_visibility_v1
on public.card_printings;
create policy card_printings_catalog_release_visibility_v1
on public.card_printings
as restrictive
for select
to public
using (public.catalog_card_print_visible_to_request_v1(card_print_id));

alter function public.search_print_identity_v1(
  text,
  text,
  text,
  text,
  integer,
  integer
) rename to search_print_identity_unfiltered_internal_v1;

revoke all on function public.search_print_identity_unfiltered_internal_v1(
  text,
  text,
  text,
  text,
  integer,
  integer
) from public, anon, authenticated, service_role;

create function public.search_print_identity_v1(
  q text default null,
  set_code_in text default null,
  number_in text default null,
  object_type_in text default null,
  limit_in integer default 50,
  offset_in integer default 0
)
returns table (
  search_document_id text,
  object_type text,
  parent_gv_id text,
  printing_gv_id text,
  display_name text,
  display_discriminator text,
  route_path text,
  route_query text,
  matched_fields text[],
  rank_score integer
)
language sql
stable
security definer
set search_path = public
as $$
  select result.*
  from public.search_print_identity_unfiltered_internal_v1(
    q,
    set_code_in,
    number_in,
    object_type_in,
    limit_in,
    offset_in
  ) result
  where public.catalog_parent_gv_id_visible_to_request_v1(result.parent_gv_id);
$$;

revoke all on function public.search_print_identity_v1(
  text,
  text,
  text,
  text,
  integer,
  integer
) from public;
grant execute on function public.search_print_identity_v1(
  text,
  text,
  text,
  text,
  integer,
  integer
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
