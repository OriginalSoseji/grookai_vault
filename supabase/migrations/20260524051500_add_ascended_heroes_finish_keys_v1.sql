-- ADD_ASCENDED_HEROES_FINISH_KEYS_V1
--
-- Adds source-backed finish keys required before Ascended Heroes missing
-- child printings can be inserted. This migration only extends the finish
-- key registry; it does not create, delete, hide, or quarantine printings.

begin;

insert into public.finish_keys (key, label, sort_order, is_active, meta)
values
  (
    'cosmos',
    'Cosmos Holo',
    35,
    true,
    jsonb_build_object(
      'source_contract', 'VERIFIED_MASTER_SET_INDEX_V1',
      'notes', 'Special holo finish used by source-backed Ascended Heroes promo/product variants.'
    )
  ),
  (
    'rocket_reverse',
    'Rocket Reverse',
    45,
    true,
    jsonb_build_object(
      'source_contract', 'VERIFIED_MASTER_SET_INDEX_V1',
      'notes', 'Team Rocket R reverse lane used by source-backed Ascended Heroes Team Rocket Pokemon.'
    )
  )
on conflict (key) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true,
  meta = public.finish_keys.meta || excluded.meta;

commit;
