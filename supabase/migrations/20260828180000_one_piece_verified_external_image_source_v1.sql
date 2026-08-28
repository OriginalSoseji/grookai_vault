begin;

alter table public.card_prints
  drop constraint if exists card_prints_image_source_check;

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
        'scryfall'::text,
        'self_hosted_tcgplayer_exact_product_v1'::text,
        'self_hosted_bandai_official_exact_base_art_v1'::text,
        'self_hosted_verified_external_exact_product_v1'::text
      ]
    )
  ) not valid;

alter table public.card_prints
  validate constraint card_prints_image_source_check;

comment on constraint card_prints_image_source_check
  on public.card_prints is
  'Allowed original image evidence providers. Storage location remains separately governed; One Piece exact products may use TCGPlayer, Bandai base art, or an identity- and hash-pinned external product source.';

commit;
