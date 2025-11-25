-- Allow pokemonapi as a valid image_source for card_prints
-- Idempotent: drop the existing check (if any) and re-add with the expanded allowed set.

alter table public.card_prints
  drop constraint if exists card_prints_image_source_check;

alter table public.card_prints
  add constraint card_prints_image_source_check
    check (image_source is null or image_source in ('tcgdex', 'ptcg', 'pokemonapi'));
