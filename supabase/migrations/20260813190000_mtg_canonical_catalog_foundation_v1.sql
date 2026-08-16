begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
begin
  if exists (
    select 1
    from public.games
    where code = 'mtg'
      and (
        id <> '4d544700-0000-4000-8000-000000000001'::uuid
        or name <> 'Magic: The Gathering'
        or coalesce(slug, '') <> 'mtg'
      )
  ) then
    raise exception 'MTG canonical game seed conflicts with an existing row';
  end if;

  if exists (
    select 1
    from public.finish_keys
    where key = 'foil'
      and label <> 'Foil'
  ) then
    raise exception 'MTG foil finish key conflicts with an existing row';
  end if;

  if exists (
    select 1
    from public.finish_keys
    where key = 'etched'
      and label <> 'Etched Foil'
  ) then
    raise exception 'MTG etched finish key conflicts with an existing row';
  end if;
end;
$$;

insert into public.games (id, code, name, slug)
values (
  '4d544700-0000-4000-8000-000000000001'::uuid,
  'mtg',
  'Magic: The Gathering',
  'mtg'
)
on conflict (code) do nothing;

insert into public.finish_keys (key, label, sort_order, is_active, meta)
values
  (
    'foil',
    'Foil',
    60,
    true,
    jsonb_build_object(
      'game_scope', jsonb_build_array('mtg'),
      'source_contract', 'MTG_CANONICAL_CATALOG_IMPORT_CONTRACT_V1',
      'publication_scope', 'mtg_v1'
    )
  ),
  (
    'etched',
    'Etched Foil',
    61,
    true,
    jsonb_build_object(
      'game_scope', jsonb_build_array('mtg'),
      'source_contract', 'MTG_CANONICAL_CATALOG_IMPORT_CONTRACT_V1',
      'publication_scope', 'deferred'
    )
  )
on conflict (key) do nothing;

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
        'mtg_eng_paper_print'::text
      ]
    )
  );

alter table public.card_prints
  drop constraint card_prints_image_source_check;

alter table public.card_prints
  add constraint card_prints_image_source_check
  check (
    image_source is null
    or image_source = any (
      array[
        'tcgdex'::text,
        'ptcg'::text,
        'pokemonapi'::text,
        'identity'::text,
        'user_photo'::text,
        'scryfall'::text
      ]
    )
  );

comment on constraint card_print_identity_identity_domain_check
  on public.card_print_identity is
  'Versioned canonical print domains, including English paper MTG print identity.';

comment on constraint card_prints_image_source_check
  on public.card_prints is
  'Allowed original image evidence providers. Storage location is tracked separately.';

commit;

