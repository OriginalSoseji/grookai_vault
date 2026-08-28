-- COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1
-- Adds only hidden Yu-Gi-Oh and Gundam game metadata foundations.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  expected record;
begin
  for expected in
    select *
    from (values
      (
        '59474f00-0000-4000-8000-000000000001'::uuid,
        'yugioh'::text,
        'Yu-Gi-Oh!'::text,
        'yu-gi-oh'::text
      ),
      (
        '47434700-0000-4000-8000-000000000001'::uuid,
        'gundam'::text,
        'Gundam Card Game'::text,
        'gundam-card-game'::text
      )
    ) as seed(id, code, name, slug)
  loop
    if exists (
      select 1
      from public.games game
      where game.code = expected.code
        and (
          game.id <> expected.id
          or game.name <> expected.name
          or coalesce(game.slug, '') <> expected.slug
        )
    ) then
      raise exception 'Wave 1 game code conflicts with the canonical seed: %', expected.code;
    end if;

    if exists (
      select 1
      from public.games game
      where (game.id = expected.id or game.slug = expected.slug)
        and game.code <> expected.code
    ) then
      raise exception 'Wave 1 game ID or slug conflicts with another game: %', expected.code;
    end if;

    if exists (
      select 1
      from public.catalog_game_release_controls control
      where control.game_code = expected.code
        and (
          control.release_status <> 'hidden'
          or control.release_version <> 'COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1'
          or control.evidence <> jsonb_build_object(
            'default', 'fail_closed',
            'canonical_promotion_authorizes_visibility', false,
            'price_publication_authorizes_visibility', false,
            'storage_upload_authorizes_visibility', false,
            'foundation_scope', 'game_metadata_only'
          )
        )
    ) then
      raise exception 'Wave 1 release control conflicts with the hidden seed: %', expected.code;
    end if;
  end loop;
end;
$$;

insert into public.games (id, code, name, slug)
values
  (
    '59474f00-0000-4000-8000-000000000001'::uuid,
    'yugioh',
    'Yu-Gi-Oh!',
    'yu-gi-oh'
  ),
  (
    '47434700-0000-4000-8000-000000000001'::uuid,
    'gundam',
    'Gundam Card Game',
    'gundam-card-game'
  )
on conflict (code) do nothing;

insert into public.catalog_game_release_controls (
  game_code,
  release_status,
  release_version,
  evidence
)
select
  seed.game_code,
  'hidden',
  'COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1',
  jsonb_build_object(
    'default', 'fail_closed',
    'canonical_promotion_authorizes_visibility', false,
    'price_publication_authorizes_visibility', false,
    'storage_upload_authorizes_visibility', false,
    'foundation_scope', 'game_metadata_only'
  )
from (values ('yugioh'::text), ('gundam'::text)) as seed(game_code)
on conflict (game_code) do nothing;

do $$
begin
  if (
    select count(*)
    from public.games
    where (id, code, name, slug) in (
      (
        '59474f00-0000-4000-8000-000000000001'::uuid,
        'yugioh',
        'Yu-Gi-Oh!',
        'yu-gi-oh'
      ),
      (
        '47434700-0000-4000-8000-000000000001'::uuid,
        'gundam',
        'Gundam Card Game',
        'gundam-card-game'
      )
    )
  ) <> 2 then
    raise exception 'Wave 1 game seed did not reconcile to exactly two rows';
  end if;

  if (
    select count(*)
    from public.catalog_game_release_controls
    where game_code in ('yugioh', 'gundam')
      and release_status = 'hidden'
      and release_version = 'COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1'
  ) <> 2 then
    raise exception 'Wave 1 release controls did not reconcile to exactly two hidden rows';
  end if;
end;
$$;

commit;
