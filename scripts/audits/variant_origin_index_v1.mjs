import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });
loadDotenv({ path: '.env', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'variant_origin_index_v1');
const OUT_INDEX_JSON = path.join(OUT_DIR, 'variant_origin_index_v1.json');
const OUT_INDEX_MD = path.join(OUT_DIR, 'variant_origin_index_v1.md');
const OUT_COVERAGE_JSON = path.join(OUT_DIR, 'variant_origin_family_coverage_v1.json');
const OUT_COVERAGE_MD = path.join(OUT_DIR, 'variant_origin_family_coverage_v1.md');
const OUT_GAPS_JSON = path.join(OUT_DIR, 'variant_origin_source_gaps_v1.json');
const OUT_GAPS_MD = path.join(OUT_DIR, 'variant_origin_source_gaps_v1.md');
const OUT_PUBLIC_COPY_JSON = path.join(OUT_DIR, 'variant_origin_public_copy_export_v1.json');
const OUT_PUBLIC_COPY_MD = path.join(OUT_DIR, 'variant_origin_public_copy_export_v1.md');

const VERSION = 'VARIANT_ORIGIN_INDEX_V1';

const SOURCES = {
  bulbapedia_error_cards: 'https://bulbapedia.bulbagarden.net/wiki/Error_cards',
  bulbapedia_jungle: 'https://bulbapedia.bulbagarden.net/wiki/Jungle_%28TCG%29',
  bulbapedia_pikachu_base_58: 'https://bulbapedia.bulbagarden.net/wiki/Pikachu_%28Base_Set_58%29',
  elitefourum_base_pikachu: 'https://www.elitefourum.com/t/base-pikachu-artwork-card-variations/15059',
  bulbapedia_build_a_bear: 'https://bulbapedia.bulbagarden.net/wiki/Build-A-Bear_Workshop_collection',
  bulbapedia_toys_r_us: 'https://bulbapedia.bulbagarden.net/wiki/Toys_%22R%22_Us_Promotional_cards_%28TCG%29',
  bulbapedia_ponyta_flashfire_14: 'https://bulbapedia.bulbagarden.net/wiki/Ponyta_%28Flashfire_14%29',
  tcgplayer_ponyta_toys_r_us: 'https://www.tcgplayer.com/product/153282/pokemon-miscellaneous-cards-and-products-ponyta-14-83-toys-r-us-promo',
  pricecharting_ponyta_toys_r_us: 'https://www.pricecharting.com/game/pokemon-generations/ponyta-toys-r-us-14',
  bulbapedia_burger_king_2009: 'https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys',
  tcgplayer_lucario_burger_king: 'https://www.tcgplayer.com/product/155611/pokemon-burger-king-promos-lucario-6-130-diamond-and-pearl',
  tcgplayer_manaphy_burger_king: 'https://www.tcgplayer.com/product/215634/pokemon-burger-king-promos-manaphy-9-130-diamond-and-pearl',
  pricecharting_palkia_burger_king: 'https://www.pricecharting.com/game/pokemon-great-encounters/palkia-stamped-26',
  pokecardvalues_manaphy_burger_king: 'https://pokecardvalues.co.uk/cards/manaphy-9-130-reverse-holo-burger-king-diamond-pearl/dp1-9-3-19/',
  bulbapedia_misc_promos: 'https://bulbapedia.bulbagarden.net/wiki/Miscellaneous_Promotional_cards_%28TCG%29',
  bulbapedia_prerelease: 'https://bulbapedia.bulbagarden.net/wiki/Prerelease_cards_%28TCG%29',
  bulbapedia_pachirisu_dp35: 'https://bulbapedia.bulbagarden.net/wiki/Pachirisu_%28Diamond_%26_Pearl_35%29',
  bulbapedia_grotle_dp49: 'https://bulbapedia.bulbagarden.net/wiki/Grotle_%28Diamond_%26_Pearl_49%29',
  bulbapedia_winner_cards: 'https://bulbapedia.bulbagarden.net/wiki/Winner_cards_%28TCG%29',
  pokemon_prize_pack_gallery: 'https://play.pokemon.com/en-us/rewards/gallery/',
  bulbapedia_prize_pack_series_one: 'https://bulbapedia.bulbagarden.net/wiki/Play%21_Pok%C3%A9mon_Prize_Pack_Series_One_%28TCG%29',
  bulbapedia_pokemon_league: 'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_League_%28TCG%29',
  bulbapedia_league_challenge: 'https://bulbapedia.bulbagarden.net/wiki/League_Challenge_%28TCG%29',
  pokebeach_pokemon_together: 'https://www.pokebeach.com/2023/11/special-pikachu-and-eevee-pokemon-together-stamped-promos-to-release-at-european-pop-ups',
  elitefourum_wotc_errors: 'https://www.elitefourum.com/t/masters-guide-for-pokemon-wotc-corrected-errors-test-cards/29328',
  cgc_black_flame_ninetales: 'https://www.cgccards.com/news/article/8861/pokemon-ninetales-variant/',
  bulbapedia_w_promos: 'https://bulbapedia.bulbagarden.net/wiki/W_Promotional_cards_%28TCG%29',
  bulbapedia_legendary_treasures: 'https://bulbapedia.bulbagarden.net/wiki/Legendary_Treasures_%28TCG%29',
  bulbapedia_generations: 'https://bulbapedia.bulbagarden.net/wiki/Generations_%28TCG%29',
  bulbapedia_celebrations: 'https://bulbapedia.bulbagarden.net/wiki/Celebrations_%28TCG%29',
  pokemon_trainer_gallery: 'https://www.pokemon.com/us/pokemon-news/a-peek-at-the-cards-of-the-pokemon-tcg-sword-shield-brilliant-stars-trainer-gallery',
  pokemon_galarian_gallery: 'https://www.pokemon.com/us/pokemon-news/discover-the-beauty-of-the-pokemon-tcg-crown-zenith-galarian-gallery',
  bulbapedia_hidden_fates: 'https://bulbapedia.bulbagarden.net/wiki/Hidden_Fates_%28TCG%29',
  bulbapedia_shining_fates: 'https://bulbapedia.bulbagarden.net/wiki/Shining_Fates_%28TCG%29',
  bulbapedia_call_of_legends: 'https://bulbapedia.bulbagarden.net/wiki/Call_of_Legends_%28TCG%29',
  psa_shiny_sh_subset: 'https://www.psacard.com/psasetregistry/showcase/variations/pokemon-diamon-pearl-platinum-2008-2009-shiny-sh-subset/imagegallery/5378',
  bulbapedia_secret_card: 'https://bulbapedia.bulbagarden.net/wiki/Secret_card_%28TCG%29',
  bulbapedia_delta_species: 'https://bulbapedia.bulbagarden.net/wiki/%CE%94_Delta_Species_%28TCG%29',
  bulbapedia_lvx: 'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_LV.X_%28TCG%29',
  bulbapedia_amazing_pokemon: 'https://bulbapedia.bulbagarden.net/wiki/Amazing_Pok%C3%A9mon_%28TCG%29',
  bulbapedia_illustration_rare: 'https://bulbapedia.bulbagarden.net/wiki/Illustration_rare_card_%28TCG%29',
  bulbapedia_platinum_arceus: 'https://bulbapedia.bulbagarden.net/wiki/Platinum%3A_Arceus_%28TCG%29',
  bulbapedia_arceus_ar9: 'https://bulbapedia.bulbagarden.net/wiki/Arceus_%28Arceus_AR9%29',
  bulbapedia_rotom_tcg: 'https://bulbapedia.bulbagarden.net/wiki/Rotom_%28TCG%29',
  bulbapedia_frost_rotom_rt2: 'https://bulbapedia.bulbagarden.net/wiki/Frost_Rotom_%28Rising_Rivals_RT2%29',
  bulbapedia_battle_academy_2022: 'https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_2022_%28TCG%29',
  pokebeach_trick_or_trade_2022: 'https://www.pokebeach.com/forums/threads/all-30-pokemon-%E2%80%9Ctrick-or-trade%E2%80%9D-halloween-cards.153244/',
  pokemon_holiday_calendar: 'https://www.pokemon.com/us/pokemon-tcg/product-gallery/holiday-calendar',
  pokemon_holiday_calendar_2025: 'https://www.pokemon.com/us/pokemon-tcg/product-gallery/holiday-calendar-2025',
  pokemon_center_holiday_calendar: 'https://www.pokemoncenter.com/product/290-85256/pokemon-tcg-holiday-calendar-glaceon-alolan-vulpix',
  bulbapedia_countdown_calendar: 'https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Countdown_Calendar_%28TCG%29',
  tcgplayer_duraludon_gamestop: 'https://www.tcgplayer.com/product/247362/pokemon-miscellaneous-cards-and-products-duraludon-swsh028-gamestop-exclusive',
  pricecharting_duraludon_gamestop: 'https://www.pricecharting.com/game/pokemon-promo/duraludon-stamped-swsh028',
  tcgplayer_charmander_ebgames: 'https://www.tcgplayer.com/product/531251/pokemon-miscellaneous-cards-and-products-charmander-004-165-ebgames-exclusive',
  pricecharting_charmander_ebgames: 'https://www.pricecharting.com/game/pokemon-scarlet-%26-violet-151/charmander-eb-games-4',
  tcgplayer_gengar_ebgames: 'https://www.tcgplayer.com/product/686505/pokemon-miscellaneous-cards-and-products-gengar-cosmos-holo-eb-games-exclusive',
  bulbapedia_detective_pikachu_sm190: 'https://bulbapedia.bulbagarden.net/wiki/Detective_Pikachu_%28SM_Promo_190%29',
  bulbapedia_bulbasaur_sm198: 'https://bulbapedia.bulbagarden.net/wiki/Bulbasaur_%28SM_Promo_198%29',
  tcgplayer_detective_pikachu_sm170_stamped: 'https://www.tcgplayer.com/product/206823/pokemon-sm-promos-detective-pikachu-sm170-stamped',
  tcgplayer_detective_pikachu_sm190_stamped: 'https://www.tcgplayer.com/product/196992/pokemon-sm-promos-detective-pikachu-sm190-stamped',
  tcgplayer_bulbasaur_sm198_detective_pikachu: 'https://www.tcgplayer.com/product/206824/pokemon-sm-promos-bulbasaur-sm198-detective-pikachu-stamped',
  bulbapedia_eevee_wizards_promo_11: 'https://bulbapedia.bulbagarden.net/wiki/Eevee_%28Wizards_Promo_11%29',
  tcgplayer_eevee_jr_east_stamp_rally: 'https://www.tcgplayer.com/product/618732/pokemon-wotc-promo-eevee-jr-east-stamp-rally',
  psa_eevee_jr_east_stamp_rally: 'https://www.psacard.com/spec/psa/2082246',
  pricecharting_radiant_greninja_gym_stamp: 'https://www.pricecharting.com/game/pokemon-astral-radiance/radiant-greninja-gym-stamp-46',
  pkmngg_radiant_greninja_astral_radiance_46: 'https://www.pkmn.gg/series/sword-shield/astral-radiance/046',
  pokebeach_prismatic_lucario_tyranitar: 'https://www.pokebeach.com/forums/threads/%E2%80%9Cprismatic-evolutions-lucario-ex-tyranitar-ex-premium-collection%E2%80%9D-to-release-at-sam%E2%80%99s-club.156293/',
  pokeguardian_prismatic_lucario_tyranitar: 'https://www.pokeguardian.com/2646761_prismatic-evolutions-lucario-ex-tyranitar-ex-premium-collection-revealed',
  pricecharting_lucario_prismatic_stamp: 'https://www.pricecharting.com/game/pokemon-prismatic-evolutions/lucario-stamped-51',
};

const FAMILY_RULES = [
  {
    family_key: 'build_a_bear_workshop_stamp',
    label: 'Build-A-Bear Workshop Stamp',
    category: 'retailer_distribution_stamp',
    confidence: 'high',
    match: ({ key }) => key.includes('build_a_bear'),
    why_it_exists: 'Build-A-Bear Workshop sold Pokémon plush releases with same-character, Build-A-Bear Workshop-branded Pokémon TCG cards.',
    why_collectors_care: 'The stamp ties the card to a specific retail plush promotion, making it physically distinguishable from the standard set card and tracked as a separate promotional lane.',
    how_to_identify: 'Look for the Build-A-Bear Workshop stamp on the card face.',
    grookai_rule: 'Visible retailer distribution stamps are modeled as parent identity modifiers, not as card finishes.',
    source_keys: ['bulbapedia_build_a_bear'],
  },
  {
    family_key: 'toys_r_us_stamp',
    label: 'Toys R Us Stamp',
    category: 'retailer_distribution_stamp',
    confidence: 'high',
    match: ({ key, row }) => key.includes('toys_r_us')
      || (key === 'stamped' && row.set_code === 'g1' && row.name === 'Ponyta'),
    why_it_exists: 'Toys R Us released special stamped promotional cards to coincide with Pokémon TCG expansion releases, beginning with the Generations era.',
    why_collectors_care: 'The Toys R Us stamp identifies a retailer-distribution copy that collectors separate from the ordinary expansion card.',
    how_to_identify: 'Look for the Toys R Us stamp on the card face.',
    grookai_rule: 'Retailer-exclusive visible stamps create parent identity lanes when the exact card/stamp pairing is source-backed.',
    source_keys: ['bulbapedia_toys_r_us', 'bulbapedia_ponyta_flashfire_14', 'tcgplayer_ponyta_toys_r_us', 'pricecharting_ponyta_toys_r_us'],
  },
  {
    family_key: 'burger_king_stamped_promo',
    label: 'Burger King Stamped Promo',
    category: 'fast_food_distribution_stamp',
    confidence: 'high',
    match: ({ key, modifier, row }) => key.includes('burger_king')
      || modifier.includes('burger_king')
      || key.includes('platinum_stamped')
      || (key === 'stamped' && ['dp1', 'dp4', 'dp5', 'dp6'].includes(row.set_code)),
    why_it_exists: 'Burger King Pokémon promotions paired selected Diamond & Pearl-era cards with Kids Meal toy campaigns; the 2009 Platinum campaign used visibly stamped reverse-holo cards.',
    why_collectors_care: 'These cards are tied to a short fast-food promotion and have an identifiable stamp, so collectors track them separately from normal Platinum-era cards.',
    how_to_identify: 'Look for the Burger King or Platinum promotional stamp on the card face and verify the card against Burger King promo product/checklist sources.',
    grookai_rule: 'Burger King stamped cards are parent identity variants; the stamped row may then carry its own supported child finish.',
    source_keys: ['bulbapedia_burger_king_2009', 'tcgplayer_lucario_burger_king', 'tcgplayer_manaphy_burger_king', 'pricecharting_palkia_burger_king', 'pokecardvalues_manaphy_burger_king'],
  },
  {
    family_key: 'pokemon_together_stamp',
    label: 'Pokémon Together Stamp',
    category: 'campaign_distribution_stamp',
    confidence: 'high',
    match: ({ key }) => key.includes('pokemon_together'),
    why_it_exists: 'The Pokémon Together stamp was used on Pikachu and Eevee promos distributed through Poké Post pop-up gift-pack campaigns.',
    why_collectors_care: 'The gold campaign stamp identifies the pop-up/gift-pack distribution copy rather than a normal set copy.',
    how_to_identify: 'Look for the Pokémon Together stamp on the card face.',
    grookai_rule: 'Campaign stamps are modeled as parent identities so the stamped copy can be owned, searched, and imaged separately.',
    source_keys: ['pokebeach_pokemon_together'],
  },
  {
    family_key: 'prize_pack_series_stamp',
    label: 'Play! Pokémon Prize Pack Stamp',
    category: 'organized_play_distribution_stamp',
    confidence: 'high',
    match: ({ key }) => key.includes('prize_pack') || key.includes('play_pokemon_stamp'),
    why_it_exists: 'Play! Pokémon Prize Packs are distributed through Organized Play programs and contain selected cards bearing a Play! Pokémon stamp.',
    why_collectors_care: 'Prize Pack cards retain original set identity but have Organized Play distribution markings, so they are collected separately from ordinary pack-pulled copies.',
    how_to_identify: 'Look for the Play! Pokémon stamp and, where present, the specific Prize Pack series marker.',
    grookai_rule: 'Prize Pack stamps are parent identity lanes; explicit series markers may create separate identity lanes under the Prize Pack governance contract.',
    source_keys: ['pokemon_prize_pack_gallery', 'bulbapedia_prize_pack_series_one'],
  },
  {
    family_key: 'trick_or_trade_pumpkin_stamp',
    label: 'Trick or Trade Pumpkin Stamp',
    category: 'seasonal_product_stamp',
    confidence: 'medium',
    match: ({ key, modifier }) => key.includes('pikachu_jack_o_lantern')
      || key === 'holiday_stamp'
      || modifier.includes('pikachu_jack_o_lantern')
      || modifier.includes('holiday_stamp'),
    why_it_exists: 'Trick or Trade Halloween mini-set cards are reprints packaged for seasonal Halloween distribution with a Pikachu pumpkin stamp on the card artwork.',
    why_collectors_care: 'The pumpkin stamp ties the card to the Halloween Trick or Trade product instead of the original expansion pack, making it a separate seasonal collector lane.',
    how_to_identify: 'Look for the Pikachu jack-o-lantern / pumpkin stamp on the card art and verify the card against the Trick or Trade checklist.',
    grookai_rule: 'Trick or Trade stamped cards are parent identity variants because the visible seasonal stamp changes distribution identity while preserving the base card identity.',
    source_keys: ['pokebeach_trick_or_trade_2022'],
  },
  {
    family_key: 'holiday_calendar_snowflake_stamp',
    label: 'Holiday Calendar Snowflake / Festive Stamp',
    category: 'seasonal_product_stamp',
    confidence: 'high',
    match: ({ key, modifier }) => key.includes('snowflake')
      || modifier.includes('snowflake'),
    why_it_exists: 'Pokémon TCG Holiday Calendar products include foil cards with festive stamps; older Countdown/Surprise Calendar products used foil snowflake stamps on included cards.',
    why_collectors_care: 'Snowflake/festive-stamped cards are tied to seasonal calendar products, so collectors track them separately from standard set copies.',
    how_to_identify: 'Look for the snowflake or festive calendar stamp on the card art and verify the card against the relevant Holiday/Countdown Calendar product list.',
    grookai_rule: 'Holiday Calendar stamped cards are parent identity variants because the seasonal product stamp changes distribution identity.',
    source_keys: ['pokemon_holiday_calendar', 'pokemon_holiday_calendar_2025', 'pokemon_center_holiday_calendar', 'bulbapedia_countdown_calendar'],
  },
  {
    family_key: 'gamestop_stamp',
    label: 'GameStop Stamp',
    category: 'retailer_distribution_stamp',
    confidence: 'medium',
    match: ({ key, modifier }) => key.includes('gamestop')
      || modifier.includes('gamestop'),
    why_it_exists: 'GameStop-stamped cards are retailer-exclusive promotional copies distributed through GameStop channels.',
    why_collectors_care: 'The GameStop stamp identifies a retailer-exclusive copy that collectors separate from unstamped promo or set copies.',
    how_to_identify: 'Look for the GameStop stamp and verify the exact card against retailer-exclusive product/checklist sources.',
    grookai_rule: 'GameStop stamps are parent identity variants when the exact card/stamp pairing is source-backed.',
    source_keys: ['tcgplayer_duraludon_gamestop', 'pricecharting_duraludon_gamestop'],
  },
  {
    family_key: 'eb_games_stamp',
    label: 'EB Games Stamp',
    category: 'retailer_distribution_stamp',
    confidence: 'medium',
    match: ({ key, modifier }) => key.includes('eb_games')
      || modifier.includes('eb_games'),
    why_it_exists: 'EB Games-stamped cards are retailer-exclusive promotional copies distributed through EB Games channels in markets where EB Games operates.',
    why_collectors_care: 'The EB Games stamp marks a regional retailer-exclusive copy, making it a distinct lane from the unstamped version of the same card.',
    how_to_identify: 'Look for the EB Games stamp and verify the exact card against retailer-exclusive product/checklist sources.',
    grookai_rule: 'EB Games stamps are parent identity variants when the exact card/stamp pairing is source-backed.',
    source_keys: ['tcgplayer_charmander_ebgames', 'pricecharting_charmander_ebgames', 'tcgplayer_gengar_ebgames'],
  },
  {
    family_key: 'detective_pikachu_movie_stamp',
    label: 'Detective Pikachu Movie Stamp',
    category: 'movie_campaign_stamp',
    confidence: 'medium',
    match: ({ key, modifier }) => key.includes('detective_pikachu')
      || key === 'pikachu_stamp'
      || modifier.includes('pikachu_stamp'),
    why_it_exists: 'Detective Pikachu stamped promos were distributed through movie-era promotional channels, including stamped SM Promo variants tied to the POKEMON Detective Pikachu campaign.',
    why_collectors_care: 'The movie stamp identifies a campaign-distribution copy that collectors separate from the ordinary SM Promo or set card.',
    how_to_identify: 'Look for the Detective Pikachu movie stamp on the card face and confirm the promo number against card-specific checklist or marketplace references.',
    grookai_rule: 'Movie-campaign stamps are parent identity variants when the exact stamped card is source-backed.',
    source_keys: ['bulbapedia_detective_pikachu_sm190', 'bulbapedia_bulbasaur_sm198', 'tcgplayer_detective_pikachu_sm170_stamped', 'tcgplayer_detective_pikachu_sm190_stamped', 'tcgplayer_bulbasaur_sm198_detective_pikachu'],
  },
  {
    family_key: 'jr_stamp_rally_promo',
    label: 'JR East Stamp Rally Promo',
    category: 'event_distribution_stamp',
    confidence: 'medium',
    match: ({ key, modifier }) => key.includes('jr_stamp_rally')
      || modifier.includes('jr_stamp_rally'),
    why_it_exists: 'JR East Stamp Rally promotional cards were tied to Japanese railway stamp-rally events and include visibly stamped promo copies.',
    why_collectors_care: 'The JR Stamp Rally mark ties the card to a narrow event-distribution context, making it distinct from the standard promo card.',
    how_to_identify: 'Look for the JR East Stamp Rally mark on the card face and verify the card against card-specific references.',
    grookai_rule: 'Stamp-rally event cards are parent identity variants when the exact card/stamp pairing is source-backed.',
    source_keys: ['bulbapedia_eevee_wizards_promo_11', 'tcgplayer_eevee_jr_east_stamp_rally', 'psa_eevee_jr_east_stamp_rally'],
  },
  {
    family_key: 'asia_gym_stamp',
    label: 'Asia Gym Stamp',
    category: 'event_or_regional_distribution_stamp',
    confidence: 'medium',
    match: ({ key, modifier }) => key.includes('gym_stamp')
      || modifier.includes('gym_stamp'),
    why_it_exists: 'Asia Gym-stamped cards are regional event/distribution copies of existing cards, with the Gym mark applied to distinguish the promotional copy from the base set printing.',
    why_collectors_care: 'The Gym stamp marks a regional/event-distribution variant that collectors track separately from the ordinary set card and from Play! Pokémon Prize Pack stamped copies.',
    how_to_identify: 'Look for the Gym stamp on the card face and confirm the exact set, card number, and name against stamp-specific catalog references.',
    grookai_rule: 'Gym-stamped rows are parent identity variants when the exact card/stamp pairing is source-backed; the stamp is not modeled as a finish.',
    source_keys: ['pricecharting_radiant_greninja_gym_stamp', 'pkmngg_radiant_greninja_astral_radiance_46'],
  },
  {
    family_key: 'prismatic_evolutions_premium_collection_stamp',
    label: 'Prismatic Evolutions Premium Collection Stamp',
    category: 'product_distribution_stamp',
    confidence: 'medium',
    match: ({ key, modifier }) => key.includes('prismatic_evolution')
      || modifier.includes('prismatic_evolution'),
    why_it_exists: 'Selected Prismatic Evolutions Premium Collection products included stamped promotional reprints such as Lucario and Tyranitar collection cards.',
    why_collectors_care: 'The product stamp identifies a collection-box distribution copy, so collectors separate it from the unstamped Prismatic Evolutions card.',
    how_to_identify: 'Look for the Prismatic Evolutions stamp on the card face and verify the exact card against product announcement or catalog sources.',
    grookai_rule: 'Product-exclusive stamps are parent identity variants when exact product/card evidence is preserved.',
    source_keys: ['pokebeach_prismatic_lucario_tyranitar', 'pokeguardian_prismatic_lucario_tyranitar', 'pricecharting_lucario_prismatic_stamp'],
  },
  {
    family_key: 'expansion_logo_or_set_stamp',
    label: 'Expansion Logo / Set Stamp',
    category: 'event_or_product_distribution_stamp',
    confidence: 'medium',
    match: ({ key }) => /(?:diamond_pearl|dragon_vault|generations_geodude|mega_evolution|phantasmal_flames|chaos_rising|cosmic_eclipse|ultra_prism|forbidden_light|celestial_storm|lost_thunder|scarlet_and_violet|obsidian_flames|paradox_rift|twilight_masquerade|stellar_crown|destined_rivals|black_bolt|white_flare|shrouded_fable|astral_radiance|lost_origin|silver_tempest|rebel_clash|darkness_ablaze|vivid_voltage|brilliant_stars)_stamp(?:ed)?$/.test(key),
    why_it_exists: 'Expansion-logo and set-name stamps are used on selected promotional reprints, including prerelease/event cards and some product or retail promotions tied to a specific expansion.',
    why_collectors_care: 'The visible set logo or expansion-name stamp changes distribution identity, so collectors track these copies separately from unstamped expansion cards.',
    how_to_identify: 'Look for the expansion logo or set-name stamp on the artwork area, then verify the exact card against the relevant prerelease, product, or card-specific release source.',
    grookai_rule: 'Set-logo stamps are parent identity variants. The family-level explanation may be public, but exact campaign/source evidence should remain attached per card where available.',
    source_keys: ['bulbapedia_prerelease', 'bulbapedia_pachirisu_dp35', 'bulbapedia_grotle_dp49'],
  },
  {
    family_key: 'pokemon_league_or_placement_stamp',
    label: 'Pokémon League / Placement Stamp',
    category: 'organized_play_placement_stamp',
    confidence: 'high',
    match: ({ key }) => key.includes('league')
      || key.includes('quarter_finalist')
      || key.includes('finalist')
      || key.includes('top_16')
      || key.includes('top_32')
      || key.includes('player_rewards')
      || key.includes('crosshatch')
      || key.includes('professor_program')
      || key.includes('championship')
      || key.includes('battle_road'),
    why_it_exists: 'Pokémon League and League Challenge events can award special stamped cards, including placement-stamped variants for top finishers.',
    why_collectors_care: 'Placement stamps encode event achievement or league distribution, making the physical card a different collector object from a normal copy.',
    how_to_identify: 'Look for a Pokémon League, League Challenge, placement, finalist, or top-cut stamp on the card face.',
    grookai_rule: 'Event and placement stamps are modeled as parent identity modifiers when the exact event/card pairing is source-backed.',
    source_keys: ['bulbapedia_pokemon_league', 'bulbapedia_league_challenge', 'bulbapedia_misc_promos'],
  },
  {
    family_key: 'winner_stamp',
    label: 'Winner Stamp',
    category: 'organized_play_winner_stamp',
    confidence: 'high',
    match: ({ key }) => key.includes('winner'),
    why_it_exists: 'Winner cards are stamped reprints released through Pokémon League or related tournament programs.',
    why_collectors_care: 'The WINNER stamp marks a tournament/league award copy and is physically distinct from the ordinary card.',
    how_to_identify: 'Look for the foil WINNER stamp on the card face.',
    grookai_rule: 'Winner-stamped cards are parent identity variants because the stamp records distribution and award context.',
    source_keys: ['bulbapedia_winner_cards'],
  },
  {
    family_key: 'prerelease_or_staff_stamp',
    label: 'Prerelease / Staff Stamp',
    category: 'event_distribution_stamp',
    confidence: 'high',
    match: ({ key }) => key.includes('prerelease') || key.includes('staff_stamp') || key.includes('_staff_') || key.endsWith('_staff'),
    why_it_exists: 'Prerelease cards are selected expansion reprints with a Prerelease or expansion-logo stamp; staff versions were produced for event organizers beginning with the Diamond & Pearl expansion.',
    why_collectors_care: 'Prerelease and Staff stamps identify event-distribution copies, and Staff copies are often more limited because they were distributed to organizers rather than regular participants.',
    how_to_identify: 'Look for a PRERELEASE, expansion-logo, or STAFF stamp on the card face.',
    grookai_rule: 'Prerelease and Staff stamps are parent identity modifiers because the stamp changes the distribution identity of the physical card.',
    source_keys: ['bulbapedia_prerelease'],
  },
  {
    family_key: 'world_championships_stamp',
    label: 'World Championships Stamp',
    category: 'event_distribution_stamp',
    confidence: 'medium',
    match: ({ key }) => key.includes('world_championships') || key.includes('worlds_'),
    why_it_exists: 'World Championships stamped cards are tied to specific championship-event distributions or staff/placement programs.',
    why_collectors_care: 'The stamp connects the card to a specific competitive event and can encode staff, placement, or event participation context.',
    how_to_identify: 'Look for the World Championships, Worlds, Staff, or placement stamp on the card face.',
    grookai_rule: 'Worlds/event-stamped rows stay parent identity variants; exact event/card provenance should be preserved before adding new lanes.',
    source_keys: ['bulbapedia_misc_promos'],
  },
  {
    family_key: 'e3_pikachu_stamp',
    label: 'E3 Pikachu Stamp',
    category: 'event_distribution_stamp',
    confidence: 'high',
    match: ({ key, modifier }) => key.includes('e3_stamp') || modifier.includes('e3_'),
    why_it_exists: 'Base Set Pikachu has E3-stamped promotional versions; Bulbapedia records red-cheeked copies from Nintendo booth distribution at E3 in May 1999 and yellow-cheeked copies from Nintendo Power.',
    why_collectors_care: 'The stamp and cheek-color combination identifies a narrow early promotional distribution and separates these copies from ordinary Base Set Pikachu.',
    how_to_identify: 'Look for the gold E3 stamp and verify whether the Pikachu artwork has red or yellow cheeks.',
    grookai_rule: 'Grookai models the E3 stamp and cheek color together because both are visible identity dimensions.',
    source_keys: ['bulbapedia_pikachu_base_58', 'elitefourum_base_pikachu'],
  },
  {
    family_key: 'base_pikachu_print_run',
    label: 'Base Pikachu Cheek / Shadowless Print Run',
    category: 'print_run_variant',
    confidence: 'high',
    match: ({ key, modifier }) => key.includes('red_cheeks') || key.includes('yellow_cheeks') || key.includes('shadowless') || key.includes('ghost_stamp') || modifier.includes('shadowless') || modifier.includes('cheeks'),
    why_it_exists: 'Early Base Set Pikachu print runs differ by cheek color, edition, shadowless frame, and in one lane a weak/ghosted First Edition stamp impression.',
    why_collectors_care: 'These visual print-run differences identify early Base Set production states and are collected separately from later Unlimited copies.',
    how_to_identify: 'Check cheek color, shadowless frame, edition stamp, and whether the First Edition stamp is absent, normal, or ghosted.',
    grookai_rule: 'Visible print-run identity differences are parent identity variants, not finishes.',
    source_keys: ['bulbapedia_pikachu_base_58', 'elitefourum_base_pikachu'],
  },
  {
    family_key: 'first_edition',
    label: 'First Edition',
    category: 'edition_print_run',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'first_edition' || modifier.includes('edition:first_edition'),
    why_it_exists: 'First Edition copies were printed with an edition stamp identifying an earlier edition of the card.',
    why_collectors_care: 'The stamp marks a separate early print identity, usually collected separately from Unlimited copies.',
    how_to_identify: 'Look for the First Edition stamp on the card face.',
    grookai_rule: 'First Edition is modeled as a parent identity modifier, not as a finish.',
    source_keys: ['bulbapedia_pikachu_base_58', 'bulbapedia_prerelease'],
  },
  {
    family_key: 'jungle_no_symbol_error',
    label: 'Jungle No Symbol Error',
    category: 'recognized_error_variant',
    confidence: 'high',
    match: ({ key, modifier }) => key.includes('no_symbol') || modifier.includes('no_jungle_symbol'),
    why_it_exists: 'Some Jungle holo rares were printed without the Jungle expansion symbol.',
    why_collectors_care: 'The missing symbol is a visible, repeatable WOTC-era error that collectors identify separately from normal Jungle holo copies.',
    how_to_identify: 'Confirm the Jungle holo rare is missing the Jungle set symbol where it should appear.',
    grookai_rule: 'Recognized repeatable production errors receive parent identity lanes when card-level evidence supports the exact card.',
    source_keys: ['bulbapedia_jungle', 'bulbapedia_error_cards'],
  },
  {
    family_key: 'wotc_recognized_error',
    label: 'WOTC Recognized Error / Correction Variant',
    category: 'recognized_error_variant',
    confidence: 'high',
    match: ({ key, modifier }) => key.includes('error')
      || key.includes('incorrect_artist')
      || key.includes('corrected_text')
      || modifier.includes('recognized_error')
      || modifier.includes('text_variant'),
    why_it_exists: 'WOTC-era production or text/artwork mistakes created repeatable physical variants such as no-damage Ninetales, missing Stage text Blastoise, and corrected/error text lanes.',
    why_collectors_care: 'Recognized repeatable errors are collected as distinct objects because they document a specific production state rather than ordinary wear or damage.',
    how_to_identify: 'Compare the affected text, artwork, HP, holo box, set symbol, or other documented error area against the corrected card.',
    grookai_rule: 'Grookai only models error lanes when they are externally recognized and repeatable at card identity level.',
    source_keys: ['bulbapedia_error_cards', 'elitefourum_wotc_errors', 'cgc_black_flame_ninetales'],
  },
  {
    family_key: 'wb_kids_stamp',
    label: 'WB Kids Stamp',
    category: 'media_promotion_stamp',
    confidence: 'high',
    match: ({ key, modifier }) => key.includes('wb_kids') || modifier.includes('wb_kids'),
    why_it_exists: 'WB Kids stamped Wizards Black Star Promos were tied to Pokémon movie-era promotional distribution; missing and inverted stamp states are recognized special cases for specific cards.',
    why_collectors_care: 'The stamp state identifies how the promo copy was distributed or mis-stamped, creating a physically distinct lane from the ordinary Black Star Promo.',
    how_to_identify: 'Check whether the WB Kids stamp is present, missing, or inverted on the card face.',
    grookai_rule: 'Grookai models WB Kids stamp states as parent identity variants when card-specific evidence is strong enough.',
    source_keys: ['bulbapedia_misc_promos', 'elitefourum_wotc_errors'],
  },
  {
    family_key: 'pokemon_center_stamp',
    label: 'Pokémon Center Stamp',
    category: 'direct_retail_promotion_stamp',
    confidence: 'medium',
    match: ({ key, modifier }) => key.includes('pokemon_center') || modifier.includes('pokemon_center'),
    why_it_exists: 'Pokémon Center stamped promos are tied to Pokémon Center direct retail or preorder campaigns for specific products.',
    why_collectors_care: 'The stamp identifies a direct-retail promotional copy that is physically distinct from an unstamped set or promo card.',
    how_to_identify: 'Look for the Pokémon Center stamp and verify the card against the exact campaign/product source.',
    grookai_rule: 'Pokémon Center stamps are parent identity variants; exact campaign text should be preserved whenever available.',
    source_keys: ['bulbapedia_misc_promos'],
  },
  {
    family_key: 'w_stamp',
    label: 'W Stamp',
    category: 'retail_promotion_stamp',
    confidence: 'high',
    match: ({ key }) => key === 'wotc_stamp' || key.includes('_w_stamp'),
    why_it_exists: 'W Promotional cards are reprints with a gold foil W stamp.',
    why_collectors_care: 'The W stamp identifies a separate promotional distribution copy from the normal expansion card.',
    how_to_identify: 'Look for the gold foil W stamp on the card face.',
    grookai_rule: 'W-stamped cards are modeled as parent identity variants.',
    source_keys: ['bulbapedia_w_promos'],
  },
  {
    family_key: 'radiant_collection_subset',
    label: 'Radiant Collection Subset',
    category: 'subset_identity',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'rc' || modifier.includes('number_prefix:rc'),
    why_it_exists: 'Radiant Collection is a separately numbered subset that appeared in Legendary Treasures and later Generations, using the RC card-number prefix.',
    why_collectors_care: 'Collectors track RC cards as a subset lane because their numbering and set membership differ from the main expansion checklist.',
    how_to_identify: 'Look for an RC-prefixed card number such as RC1, RC10, or RC25.',
    grookai_rule: 'Subset card-number prefixes are modeled as parent identity lanes when they change checklist membership.',
    source_keys: ['bulbapedia_legendary_treasures', 'bulbapedia_generations'],
  },
  {
    family_key: 'classic_collection_subset',
    label: 'Celebrations Classic Collection',
    category: 'subset_identity',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'cc' || modifier.includes('classic_collection') || modifier.includes('number_prefix:cc'),
    why_it_exists: 'Celebrations included a Classic Collection subset of close replicas of popular older cards with special treatment and retained original-style numbering.',
    why_collectors_care: 'Classic Collection cards are tracked separately from both the main Celebrations set and the original historical cards they reference.',
    how_to_identify: 'Look for the Celebrations Classic Collection treatment and card identity rather than treating it as the original vintage print.',
    grookai_rule: 'Classic Collection is a parent identity lane because it is a separate modern subset, not a finish variant of the original card.',
    source_keys: ['bulbapedia_celebrations'],
  },
  {
    family_key: 'trainer_gallery_subset',
    label: 'Trainer Gallery Subset',
    category: 'subset_identity',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'tg' || modifier.includes('number_prefix:tg'),
    why_it_exists: 'Trainer Gallery cards are a subset focused on the relationship between Trainer and Pokémon, using TG-prefixed numbering in Sword & Shield expansions.',
    why_collectors_care: 'TG cards are collected as a separate gallery subset because their numbering, artwork concept, and checklist position are distinct from the main set.',
    how_to_identify: 'Look for a TG-prefixed card number and Trainer Gallery artwork treatment.',
    grookai_rule: 'Trainer Gallery is modeled as parent identity, not a finish, because the card belongs to a separate numbered subset.',
    source_keys: ['pokemon_trainer_gallery'],
  },
  {
    family_key: 'galarian_gallery_subset',
    label: 'Galarian Gallery Subset',
    category: 'subset_identity',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'gg' || modifier.includes('number_prefix:gg'),
    why_it_exists: 'Crown Zenith introduced a Galarian Gallery subset identified by GG01 through GG70 numbering.',
    why_collectors_care: 'GG cards are collected as their own gallery checklist because the subset has its own numbering and art-focused identity.',
    how_to_identify: 'Look for a GG-prefixed card number such as GG01 through GG70.',
    grookai_rule: 'Galarian Gallery is modeled as parent identity because the GG prefix is a checklist identity, not a finish.',
    source_keys: ['pokemon_galarian_gallery'],
  },
  {
    family_key: 'shiny_vault_subset',
    label: 'Shiny Vault Subset',
    category: 'subset_identity',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'sv' || modifier.includes('number_prefix:sv'),
    why_it_exists: 'Shiny Vault subsets collect Shiny Pokémon cards under SV-prefixed numbering, including Hidden Fates and Shining Fates.',
    why_collectors_care: 'SV cards are tracked separately because they are Shiny Pokémon subset cards with their own numbering and checklist identity.',
    how_to_identify: 'Look for an SV-prefixed card number and Shiny Pokémon artwork/identity.',
    grookai_rule: 'Shiny Vault cards are parent identity lanes because SV numbering is part of the printed checklist identity.',
    source_keys: ['bulbapedia_hidden_fates', 'bulbapedia_shining_fates'],
  },
  {
    family_key: 'call_of_legends_sl_subset',
    label: 'Call of Legends SL Shiny Secret Subset',
    category: 'subset_identity',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'sl' || modifier.includes('number_prefix:sl'),
    why_it_exists: 'Call of Legends included Shiny Secret prints of Legendary Pokémon, commonly identified by SL-prefixed numbering.',
    why_collectors_care: 'SL cards are collected as a distinct high-interest subset because they are Shiny Secret prints outside the ordinary numbered checklist.',
    how_to_identify: 'Look for an SL-prefixed card number in Call of Legends.',
    grookai_rule: 'SL-prefixed cards are parent identity lanes because the prefix is a printed subset identity.',
    source_keys: ['bulbapedia_call_of_legends'],
  },
  {
    family_key: 'dp_platinum_shiny_sh_subset',
    label: 'Diamond/Pearl/Platinum SH Shiny Subset',
    category: 'subset_identity',
    confidence: 'medium',
    match: ({ key, modifier }) => key === 'sh' || modifier.includes('number_prefix:sh'),
    why_it_exists: 'Diamond & Pearl and Platinum-era Shiny cards are commonly tracked as an SH-prefixed shiny subset.',
    why_collectors_care: 'SH cards are sought as shiny variant subset cards and are not ordinary main-set numbering lanes.',
    how_to_identify: 'Look for an SH-prefixed card number such as SH1 through SH12.',
    grookai_rule: 'SH-prefixed cards are parent identity lanes because the prefix encodes subset identity.',
    source_keys: ['psa_shiny_sh_subset'],
  },
  {
    family_key: 'secret_or_h_prefix_identity',
    label: 'Secret / H-Prefix Number Identity',
    category: 'numbering_identity',
    confidence: 'medium',
    match: ({ key, modifier }) => key === 'h' || modifier.includes('number_prefix:h') || /^ar$|^rt$/i.test(key),
    why_it_exists: 'Some older and special sets use nonstandard prefixes or secret numbering lanes that identify cards outside the ordinary numeric checklist.',
    why_collectors_care: 'The prefix changes checklist identity and helps collectors distinguish secret/subset cards from normal numbered cards.',
    how_to_identify: 'Check the printed card number prefix and compare it to the set checklist.',
    grookai_rule: 'Number-prefix identities are parent identity lanes when the prefix changes checklist membership.',
    source_keys: ['bulbapedia_secret_card'],
  },
  {
    family_key: 'delta_species_identity',
    label: 'Delta Species Identity',
    category: 'mechanic_identity',
    confidence: 'high',
    match: ({ modifier }) => modifier.includes('delta_species'),
    why_it_exists: 'δ Delta Species are a distinct kind of Pokémon card first introduced in EX Delta Species, often showing Pokémon with unusual types compared with their normal identity.',
    why_collectors_care: 'Collectors track Delta Species separately because the δ mark and altered typing define a recognizable EX-era mechanic and theme, not just a finish.',
    how_to_identify: 'Look for the δ / Delta Species marker and the unusual type assignment on the card.',
    grookai_rule: 'Delta Species is a parent identity modifier because it changes the printed card identity and search meaning.',
    source_keys: ['bulbapedia_delta_species'],
  },
  {
    family_key: 'pokemon_lvx_identity',
    label: 'Pokémon LV.X Identity',
    category: 'mechanic_identity',
    confidence: 'high',
    match: ({ modifier }) => modifier.includes('level_x'),
    why_it_exists: 'Pokémon LV.X cards were introduced in Diamond & Pearl as Level-Up Pokémon representing a stronger trained state.',
    why_collectors_care: 'LV.X cards are a distinct era mechanic with unique naming, rules treatment, and checklist identity, so collectors track them apart from ordinary versions of the same Pokémon.',
    how_to_identify: 'Look for LV.X in the card name and Level-Up styling.',
    grookai_rule: 'LV.X is modeled as parent identity because it is part of the printed card name/mechanic identity.',
    source_keys: ['bulbapedia_lvx'],
  },
  {
    family_key: 'arceus_ar_subset',
    label: 'Platinum Arceus AR Subset',
    category: 'subset_identity',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'ar' || modifier.includes('number_prefix:ar'),
    why_it_exists: 'Platinum: Arceus includes a distinct AR-numbered Arceus subset, with individual Arceus cards carrying AR-prefixed card numbers.',
    why_collectors_care: 'The AR prefix identifies a themed Arceus subset checklist rather than ordinary set numbering.',
    how_to_identify: 'Look for an AR-prefixed card number such as AR1 through AR9.',
    grookai_rule: 'AR-prefixed cards are parent identity lanes because the prefix changes checklist membership.',
    source_keys: ['bulbapedia_platinum_arceus', 'bulbapedia_arceus_ar9'],
  },
  {
    family_key: 'rotom_rt_subset',
    label: 'Rising Rivals Rotom RT Subset',
    category: 'subset_identity',
    confidence: 'medium',
    match: ({ key, modifier }) => key === 'rt' || modifier.includes('number_prefix:rt'),
    why_it_exists: 'Rising Rivals includes Rotom-form cards with RT-prefixed card numbers.',
    why_collectors_care: 'The RT prefix identifies the Rotom-form subset lane and keeps these cards distinct from ordinary numbered Rising Rivals cards.',
    how_to_identify: 'Look for an RT-prefixed card number and Rotom form identity.',
    grookai_rule: 'RT-prefixed cards are parent identity lanes because the prefix changes printed checklist identity.',
    source_keys: ['bulbapedia_rotom_tcg', 'bulbapedia_frost_rotom_rt2'],
  },
  {
    family_key: 'amazing_rare_identity',
    label: 'Amazing Rare Identity',
    category: 'rarity_art_identity',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'amazing_rare' || modifier.includes('amazing_rare'),
    why_it_exists: 'Amazing Pokémon / Amazing Rare cards were introduced in Vivid Voltage and are identified by Amazing Rare rarity and artwork with a multicolored background extending beyond the frame.',
    why_collectors_care: 'Amazing Rares are tracked as a recognizable Sword & Shield-era rarity/art treatment rather than ordinary rares.',
    how_to_identify: 'Look for the Amazing Rare rarity mark and multicolored full-frame artwork effect.',
    grookai_rule: 'Amazing Rare is a parent identity label when it is stored as a visible collector identity lane.',
    source_keys: ['bulbapedia_amazing_pokemon'],
  },
  {
    family_key: 'illustration_rare_identity',
    label: 'Illustration Rare Identity',
    category: 'rarity_art_identity',
    confidence: 'high',
    match: ({ key, modifier }) => key === 'illustration_rare' || modifier.includes('illustration_rare'),
    why_it_exists: 'Illustration Rare is a Scarlet & Violet-era rarity outside Asia, used for Full Art Secret cards focused on expanded character or environment artwork.',
    why_collectors_care: 'Illustration Rares are collected as a modern art-focused rarity lane with distinct checklist and rarity meaning, not as ordinary set copies.',
    how_to_identify: 'Look for the Illustration Rare rarity label/symbol and the full-art scene treatment.',
    grookai_rule: 'Illustration Rare is a parent identity label when the printed card is stored as a distinct art/rarity lane.',
    source_keys: ['bulbapedia_illustration_rare'],
  },
  {
    family_key: 'battle_academy_deck_mark',
    label: 'Battle Academy Deck Mark',
    category: 'product_deck_identity',
    confidence: 'medium',
    match: ({ key, modifier }) => key.includes('battle_academy') || modifier.includes('battle_academy'),
    why_it_exists: 'Battle Academy products are beginner-friendly deck kits with fixed decks and teaching materials; some included cards carry deck/tutorial identity marks.',
    why_collectors_care: 'Deck-marked Battle Academy cards come from a specific teaching product and can be separated from normal set copies.',
    how_to_identify: 'Look for Battle Academy deck or sequence marks and confirm the source product year.',
    grookai_rule: 'Battle Academy deck-mark rows are parent identity variants when the mark is visible and source-backed.',
    source_keys: ['bulbapedia_battle_academy_2022'],
  },
  {
    family_key: 'retailer_or_product_stamp_needs_origin_source',
    label: 'Retailer / Product Stamp Needs Origin Source',
    category: 'source_gap',
    confidence: 'needs_source',
    match: ({ key }) => key.includes('stamp'),
    why_it_exists: 'The DB row has a stamp-bearing identity key, but this first origin pass did not have enough preserved source context to write a specific campaign/product origin.',
    why_collectors_care: 'Stamped cards are usually collected separately, but Grookai should not invent the campaign story without preserved source evidence.',
    how_to_identify: 'Use the visible stamp label and card identity, then collect exact source evidence for the campaign/product distribution.',
    grookai_rule: 'Keep the row canonical if already source-backed, but mark the origin explanation as needing source acquisition before public educational copy is shown.',
    source_keys: [],
  },
  {
    family_key: 'letter_or_suffix_identity_needs_scope_decision',
    label: 'Letter / Suffix Identity Needs Scope Decision',
    category: 'scope_gap',
    confidence: 'needs_scope_decision',
    match: ({ key }) => /^[a-z0-9!?★☆]{1,4}$/i.test(key),
    why_it_exists: 'This row uses a short variant/suffix token that appears to encode printed identity rather than a campaign stamp or special-origin story.',
    why_collectors_care: 'Some suffixes are collector-meaningful, but not every printed suffix needs a historical origin explanation.',
    how_to_identify: 'Review set, number, and active identity payload to decide whether this belongs in Variant Origin Index or a separate printed-identity explanation index.',
    grookai_rule: 'Do not publish a special-origin explanation until the lane is classified as stamp, error, print-run, or other collector-origin family.',
    source_keys: [],
  },
];

function getDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isMeaningfulVariant(row) {
  const key = normalizeKey(row.variant_key);
  const modifier = normalizeKey(row.printed_identity_modifier);
  if (!key && !modifier) return false;
  if (['', 'base', 'default', 'normal', 'standard', 'none'].includes(key) && !modifier) return false;
  return true;
}

function classify(row) {
  const key = normalizeKey(row.variant_key);
  const modifier = normalizeKey(row.printed_identity_modifier);
  return FAMILY_RULES.find((rule) => rule.match({ key, modifier, row }))
    ?? {
      family_key: 'unclassified_special_identity',
      label: 'Unclassified Special Identity',
      category: 'source_gap',
      confidence: 'needs_source',
      why_it_exists: 'This parent row has a non-base variant/modifier, but the origin family is not yet mapped.',
      why_collectors_care: 'It may still be a legitimate collector lane, but Grookai should not publish origin copy until the family is reviewed.',
      how_to_identify: 'Review the visible card, variant key, printed identity modifier, and original evidence source.',
      grookai_rule: 'Unclassified rows stay canonical if already reconciled, but public origin text is blocked.',
      source_keys: [],
    };
}

function sampleValues(values, limit = 8) {
  return [...new Set(values.filter(Boolean))].sort().slice(0, limit);
}

function markdownTable(rows, columns) {
  if (!rows.length) return 'None.';
  const header = `| ${columns.map((column) => column.label).join(' |')} |`;
  const sep = `| ${columns.map(() => '---').join(' |')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => {
    const value = column.value(row);
    return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  }).join(' |')} |`);
  return [header, sep, ...body].join('\n');
}

async function queryRows(client) {
  const { rows } = await client.query(`
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.set_code,
      cp.number,
      cp.variant_key,
      cp.printed_identity_modifier,
      cp.rarity,
      s.name as set_name,
      s.source ->> 'domain' as set_source_domain,
      coalesce(cpr.child_count, 0)::int as child_count,
      coalesce(cpr.child_finishes, array[]::text[]) as child_finishes
    from public.card_prints cp
    left join public.sets s on s.id = cp.set_id
    left join lateral (
      select
        count(*)::int as child_count,
        array_agg(distinct cpr.finish_key order by cpr.finish_key) filter (where cpr.finish_key is not null) as child_finishes
      from public.card_printings cpr
      where cpr.card_print_id = cp.id
    ) cpr on true
    where (
      coalesce(nullif(cp.variant_key, ''), '') <> ''
      or coalesce(nullif(cp.printed_identity_modifier, ''), '') <> ''
    )
    order by cp.set_code, cp.number, cp.name, cp.variant_key nulls last, cp.printed_identity_modifier nulls last
  `);

  return rows.filter(isMeaningfulVariant);
}

function buildFamilyRows(rows) {
  const groups = new Map();
  const classifiedRows = rows.map((row) => {
    const family = classify(row);
    return {
      ...row,
      family_key: family.family_key,
      family_label: family.label,
      origin_confidence: family.confidence,
    };
  });

  for (const row of classifiedRows) {
    if (!groups.has(row.family_key)) groups.set(row.family_key, []);
    groups.get(row.family_key).push(row);
  }

  return [...groups.entries()].map(([familyKey, familyRows]) => {
    const family = FAMILY_RULES.find((rule) => rule.family_key === familyKey)
      ?? classify(familyRows[0]);
    return {
      family_key: family.family_key,
      family_label: family.label,
      variant_category: family.category,
      modeling_level: 'parent_identity',
      confidence: family.confidence,
      why_it_exists: family.why_it_exists,
      why_collectors_care: family.why_collectors_care,
      how_to_identify: family.how_to_identify,
      grookai_rule: family.grookai_rule,
      source_urls: (family.source_keys ?? []).map((sourceKey) => SOURCES[sourceKey]).filter(Boolean),
      parent_row_count: familyRows.length,
      child_row_count: familyRows.reduce((sum, row) => sum + Number(row.child_count ?? 0), 0),
      sample_gv_ids: sampleValues(familyRows.map((row) => row.gv_id), 10),
      sample_cards: familyRows.slice(0, 10).map((row) => ({
        gv_id: row.gv_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        variant_key: row.variant_key,
        printed_identity_modifier: row.printed_identity_modifier,
      })),
      source_status: family.source_keys?.length ? 'origin_source_backed' : 'origin_needs_source',
      public_copy_safe: Boolean(family.source_keys?.length) && !String(family.confidence).startsWith('needs_'),
    };
  }).sort((a, b) => {
    if (a.public_copy_safe !== b.public_copy_safe) return a.public_copy_safe ? -1 : 1;
    return b.parent_row_count - a.parent_row_count || a.family_key.localeCompare(b.family_key);
  });
}

function buildPublicCopyRows(rows, families) {
  const familyByKey = new Map(families.map((family) => [family.family_key, family]));
  return rows
    .map((row) => {
      const familyRule = classify(row);
      const family = familyByKey.get(familyRule.family_key);
      if (!family?.public_copy_safe) return null;
      return {
        card_print_id: row.id,
        gv_id: row.gv_id,
        card_name: row.name,
        set_code: row.set_code,
        set_name: row.set_name,
        card_number: row.number,
        rarity: row.rarity,
        variant_key: row.variant_key,
        printed_identity_modifier: row.printed_identity_modifier,
        child_finishes: row.child_finishes,
        child_printing_count: Number(row.child_count ?? 0),
        origin_family_key: family.family_key,
        origin_family_label: family.family_label,
        variant_category: family.variant_category,
        confidence: family.confidence,
        why_it_exists: family.why_it_exists,
        why_collectors_care: family.why_collectors_care,
        how_to_identify: family.how_to_identify,
        grookai_rule: family.grookai_rule,
        source_urls: family.source_urls,
        public_copy_safe: true,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (
      String(a.set_code ?? '').localeCompare(String(b.set_code ?? ''))
      || String(a.card_number ?? '').localeCompare(String(b.card_number ?? ''), undefined, { numeric: true })
      || String(a.card_name ?? '').localeCompare(String(b.card_name ?? ''))
      || String(a.origin_family_key ?? '').localeCompare(String(b.origin_family_key ?? ''))
    ));
}

async function main() {
  const dbUrl = getDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only origin audit.');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let rows;
  try {
    rows = await queryRows(client);
  } finally {
    await client.end();
  }

  const families = buildFamilyRows(rows);
  const safeFamilies = families.filter((family) => family.public_copy_safe);
  const gapFamilies = families.filter((family) => !family.public_copy_safe);
  const publicCopyRows = buildPublicCopyRows(rows, families);
  const gapRows = rows
    .map((row) => ({ ...row, family: classify(row) }))
    .filter((row) => {
      const family = families.find((entry) => entry.family_key === row.family.family_key);
      return !family?.public_copy_safe;
    })
    .map((row) => ({
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      family_key: row.family.family_key,
      family_label: row.family.label,
      reason: row.family.source_keys?.length
        ? 'Family has source references but is not marked safe for public copy.'
        : 'Family needs exact origin source or scope decision before public origin copy.',
    }));

  const common = {
    generated_at: new Date().toISOString(),
    version: VERSION,
    mode: 'read_only_origin_index',
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  };

  const indexReport = {
    ...common,
    fingerprint_sha256: sha256(JSON.stringify(families)),
    summary: {
      parent_variant_rows_audited: rows.length,
      origin_families: families.length,
      public_copy_safe_families: safeFamilies.length,
      source_gap_families: gapFamilies.length,
      public_copy_safe_parent_rows: safeFamilies.reduce((sum, family) => sum + family.parent_row_count, 0),
      source_gap_parent_rows: gapFamilies.reduce((sum, family) => sum + family.parent_row_count, 0),
    },
    families,
  };

  const coverageReport = {
    ...common,
    fingerprint_sha256: sha256(JSON.stringify(families.map((family) => ({
      family_key: family.family_key,
      parent_row_count: family.parent_row_count,
      public_copy_safe: family.public_copy_safe,
    })))),
    summary: indexReport.summary,
    rows: families.map((family) => ({
      family_key: family.family_key,
      family_label: family.family_label,
      variant_category: family.variant_category,
      parent_row_count: family.parent_row_count,
      child_row_count: family.child_row_count,
      source_status: family.source_status,
      public_copy_safe: family.public_copy_safe,
      confidence: family.confidence,
      sample_gv_ids: family.sample_gv_ids,
    })),
  };

  const gapsReport = {
    ...common,
    fingerprint_sha256: sha256(JSON.stringify(gapRows)),
    summary: {
      source_gap_families: gapFamilies.length,
      source_gap_parent_rows: gapRows.length,
    },
    families: gapFamilies,
    rows: gapRows,
  };

  const publicCopyReport = {
    ...common,
    mode: 'read_only_public_copy_export',
    fingerprint_sha256: sha256(JSON.stringify(publicCopyRows.map((row) => ({
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      origin_family_key: row.origin_family_key,
      source_urls: row.source_urls,
    })))),
    summary: {
      public_copy_safe_parent_rows: publicCopyRows.length,
      public_copy_safe_families: safeFamilies.length,
      blocked_parent_rows_excluded: gapRows.length,
      source_urls_preserved: [...new Set(publicCopyRows.flatMap((row) => row.source_urls))].length,
    },
    rows: publicCopyRows,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_INDEX_JSON, `${JSON.stringify(indexReport, null, 2)}\n`);
  await fs.writeFile(OUT_COVERAGE_JSON, `${JSON.stringify(coverageReport, null, 2)}\n`);
  await fs.writeFile(OUT_GAPS_JSON, `${JSON.stringify(gapsReport, null, 2)}\n`);
  await fs.writeFile(OUT_PUBLIC_COPY_JSON, `${JSON.stringify(publicCopyReport, null, 2)}\n`);

  await fs.writeFile(OUT_INDEX_MD, renderIndex(indexReport));
  await fs.writeFile(OUT_COVERAGE_MD, renderCoverage(coverageReport));
  await fs.writeFile(OUT_GAPS_MD, renderGaps(gapsReport));
  await fs.writeFile(OUT_PUBLIC_COPY_MD, renderPublicCopy(publicCopyReport));

  console.log(JSON.stringify(indexReport.summary, null, 2));
  console.log(JSON.stringify({ public_copy_export: publicCopyReport.summary }, null, 2));
}

function renderIndex(report) {
  const safe = report.families.filter((family) => family.public_copy_safe);
  return [
    '# Variant Origin Index V1',
    '',
    'Read-only origin index for parent-level special identity lanes. This deliberately excludes ordinary child finish explanations such as normal, holo, and reverse holo.',
    '',
    '```text',
    'db_writes_performed: false',
    'migrations_created: false',
    'cleanup_performed: false',
    'quarantine_performed: false',
    '```',
    '',
    '## Summary',
    '',
    `- Parent variant rows audited: ${report.summary.parent_variant_rows_audited}`,
    `- Origin families: ${report.summary.origin_families}`,
    `- Public-copy-safe families: ${report.summary.public_copy_safe_families}`,
    `- Source-gap families: ${report.summary.source_gap_families}`,
    `- Public-copy-safe parent rows: ${report.summary.public_copy_safe_parent_rows}`,
    `- Source-gap parent rows: ${report.summary.source_gap_parent_rows}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Public-Copy-Safe Families',
    '',
    markdownTable(safe, [
      { label: 'Family', value: (row) => row.family_label },
      { label: 'Category', value: (row) => row.variant_category },
      { label: 'Rows', value: (row) => row.parent_row_count },
      { label: 'Why It Exists', value: (row) => row.why_it_exists },
      { label: 'Why Collectors Care', value: (row) => row.why_collectors_care },
    ]),
    '',
    '## Family Details',
    '',
    ...safe.flatMap((family) => [
      `### ${family.family_label}`,
      '',
      `- Family key: \`${family.family_key}\``,
      `- Category: \`${family.variant_category}\``,
      `- Parent rows: ${family.parent_row_count}`,
      `- Confidence: \`${family.confidence}\``,
      '',
      `Why it exists: ${family.why_it_exists}`,
      '',
      `Why collectors care: ${family.why_collectors_care}`,
      '',
      `How to identify: ${family.how_to_identify}`,
      '',
      `Grookai rule: ${family.grookai_rule}`,
      '',
      'Sources:',
      ...family.source_urls.map((url) => `- ${url}`),
      '',
    ]),
  ].join('\n');
}

function renderCoverage(report) {
  return [
    '# Variant Origin Family Coverage V1',
    '',
    'Coverage summary for parent-level special identity origin families.',
    '',
    markdownTable(report.rows, [
      { label: 'Family', value: (row) => row.family_label },
      { label: 'Category', value: (row) => row.variant_category },
      { label: 'Parent Rows', value: (row) => row.parent_row_count },
      { label: 'Children', value: (row) => row.child_row_count },
      { label: 'Source Status', value: (row) => row.source_status },
      { label: 'Public Copy Safe', value: (row) => row.public_copy_safe ? 'yes' : 'no' },
      { label: 'Confidence', value: (row) => row.confidence },
    ]),
    '',
  ].join('\n');
}

function renderGaps(report) {
  return [
    '# Variant Origin Source Gaps V1',
    '',
    'Rows and families that need exact origin source acquisition or a scope decision before public educational copy should be shown.',
    '',
    '```text',
    'db_writes_performed: false',
    'migrations_created: false',
    'cleanup_performed: false',
    'quarantine_performed: false',
    '```',
    '',
    '## Summary',
    '',
    `- Source-gap families: ${report.summary.source_gap_families}`,
    `- Source-gap parent rows: ${report.summary.source_gap_parent_rows}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Gap Families',
    '',
    markdownTable(report.families, [
      { label: 'Family', value: (row) => row.family_label },
      { label: 'Category', value: (row) => row.variant_category },
      { label: 'Rows', value: (row) => row.parent_row_count },
      { label: 'Reason', value: (row) => row.why_it_exists },
    ]),
    '',
    '## Gap Rows',
    '',
    markdownTable(report.rows.slice(0, 200), [
      { label: 'GV ID', value: (row) => row.gv_id },
      { label: 'Card', value: (row) => `${row.name} ${row.set_code ?? ''} ${row.number ?? ''}`.trim() },
      { label: 'Variant', value: (row) => row.variant_key },
      { label: 'Modifier', value: (row) => row.printed_identity_modifier },
      { label: 'Family', value: (row) => row.family_label },
      { label: 'Reason', value: (row) => row.reason },
    ]),
    '',
  ].join('\n');
}

function renderPublicCopy(report) {
  return [
    '# Variant Origin Public Copy Export V1',
    '',
    'Website-ready export for parent-level special variant explanations. This file contains only source-backed rows that are safe to show as educational copy.',
    '',
    '```text',
    'db_writes_performed: false',
    'migrations_created: false',
    'cleanup_performed: false',
    'quarantine_performed: false',
    'blocked_rows_excluded: true',
    '```',
    '',
    '## Summary',
    '',
    `- Public-copy-safe parent rows: ${report.summary.public_copy_safe_parent_rows}`,
    `- Public-copy-safe families: ${report.summary.public_copy_safe_families}`,
    `- Blocked parent rows excluded: ${report.summary.blocked_parent_rows_excluded}`,
    `- Source URLs preserved: ${report.summary.source_urls_preserved}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Usage Contract',
    '',
    '- Use this export for card-detail educational copy such as "Why this variant exists" and "Why collectors care".',
    '- Do not use this export to create, delete, merge, or mutate canonical rows.',
    '- Do not show public origin copy for rows absent from this export; use the governance/gap reports instead.',
    '- Child finishes remain separate from parent variant origin. Do not use this file to explain ordinary holo/reverse/normal finishes.',
    '',
    '## Export Rows',
    '',
    markdownTable(report.rows.slice(0, 300), [
      { label: 'GV ID', value: (row) => row.gv_id },
      { label: 'Card', value: (row) => `${row.card_name} ${row.set_code ?? ''} ${row.card_number ?? ''}`.trim() },
      { label: 'Family', value: (row) => row.origin_family_label },
      { label: 'Why It Exists', value: (row) => row.why_it_exists },
      { label: 'Why Collectors Care', value: (row) => row.why_collectors_care },
    ]),
    '',
    report.rows.length > 300 ? `_Showing first 300 rows of ${report.rows.length}. Use JSON for the full export._\n` : '',
  ].join('\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
