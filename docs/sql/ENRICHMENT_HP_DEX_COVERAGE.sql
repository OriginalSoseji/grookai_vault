-- Coverage checks for Pokemon enrichment (HP + National Dex)
-- Run in Supabase Studio. Read-only diagnostics.

-- How many card_prints total
select count(*) as total_card_prints from card_prints;

-- Trait rows coverage
select
  count(*) as card_print_traits_rows,
  count(*) filter (where hp is not null) as trait_rows_with_hp,
  count(*) filter (where national_dex is not null) as trait_rows_with_dex
from card_print_traits;

-- Pokemon-only coverage (by game on sets)
select
  s.game,
  count(*) as card_prints,
  count(*) filter (where t.hp is not null) as prints_with_hp,
  count(*) filter (where t.national_dex is not null) as prints_with_dex
from card_prints cp
join sets s on cp.set_id = s.id
left join card_print_traits t on t.card_print_id = cp.id
group by s.game
order by card_prints desc;

-- PokemonAPI external mappings coverage
select count(*) as pokemonapi_mappings
from external_mappings
where source = 'pokemonapi';

select count(distinct card_print_id) as mapped_card_prints
from external_mappings
where source = 'pokemonapi';

select count(*) as pokemonapi_raw_cards
from raw_imports
where source = 'pokemonapi'
  and payload->>'_kind' = 'card';

-- Detect duplicate pokemonapi external_id mapping to multiple card_prints
select external_id, count(distinct card_print_id) as distinct_card_prints
from external_mappings
where source = 'pokemonapi'
group by external_id
having count(distinct card_print_id) > 1
order by distinct_card_prints desc;

-- Trait coverage for types/rarity on PokemonAPI-mapped prints
select
  count(*) as mapped_card_prints,
  count(*) filter (where t.types is not null) as with_types,
  count(*) filter (where t.rarity is not null) as with_rarity,
  count(*) filter (where t.supertype is not null) as with_supertype,
  count(*) filter (where t.card_category is not null) as with_card_category
from external_mappings em
join card_print_traits t on t.card_print_id = em.card_print_id
where em.source = 'pokemonapi';
