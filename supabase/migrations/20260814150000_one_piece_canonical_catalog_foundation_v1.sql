-- ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1
-- Adds only the hidden One Piece game foundation and identity-domain support.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  current_identity_constraint text;
begin
  if exists (
    select 1
    from public.games
    where code = 'one_piece'
      and (
        id <> '4f504300-0000-4000-8000-000000000001'::uuid
        or name <> 'One Piece Card Game'
        or coalesce(slug, '') <> 'one-piece'
      )
  ) then
    raise exception 'One Piece canonical game seed conflicts with an existing row';
  end if;

  if exists (
    select 1
    from public.games
    where id = '4f504300-0000-4000-8000-000000000001'::uuid
      and code <> 'one_piece'
  ) then
    raise exception 'One Piece canonical game UUID conflicts with an existing row';
  end if;

  if exists (
    select 1
    from public.catalog_game_release_controls
    where game_code = 'one_piece'
      and (
        release_status <> 'hidden'
        or release_version <> 'ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1'
      )
  ) then
    raise exception 'One Piece release control conflicts with the hidden foundation';
  end if;

  select pg_get_constraintdef(oid)
  into current_identity_constraint
  from pg_constraint
  where conrelid = 'public.card_print_identity'::regclass
    and conname = 'card_print_identity_identity_domain_check';

  if current_identity_constraint is null
    or position('mtg_eng_paper_print' in current_identity_constraint) = 0
    or position('one_piece_eng_print' in current_identity_constraint) > 0
  then
    raise exception 'Canonical identity-domain constraint is not the expected pre-migration version';
  end if;
end;
$$;

insert into public.games (id, code, name, slug)
values (
  '4f504300-0000-4000-8000-000000000001'::uuid,
  'one_piece',
  'One Piece Card Game',
  'one-piece'
)
on conflict (code) do nothing;

insert into public.catalog_game_release_controls (
  game_code,
  release_status,
  release_version,
  evidence
)
values (
  'one_piece',
  'hidden',
  'ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1',
  jsonb_build_object(
    'default', 'fail_closed',
    'canonical_promotion_authorizes_visibility', false,
    'price_publication_authorizes_visibility', false,
    'storage_upload_authorizes_visibility', false
  )
)
on conflict (game_code) do nothing;

alter table public.card_print_identity
  drop constraint card_print_identity_identity_domain_check;

alter table public.card_print_identity
  add constraint card_print_identity_identity_domain_check
  check (
    identity_domain = any (
      array[
        'pokemon_eng_standard'::text,
        'pokemon_ba'::text,
        'pokemon_eng_special_print'::text,
        'pokemon_jpn'::text,
        'mtg_eng_paper_print'::text,
        'one_piece_eng_print'::text
      ]
    )
  );

comment on constraint card_print_identity_identity_domain_check
  on public.card_print_identity is
  'Versioned canonical print domains, including hidden English One Piece print identity.';

notify pgrst, 'reload schema';

commit;
