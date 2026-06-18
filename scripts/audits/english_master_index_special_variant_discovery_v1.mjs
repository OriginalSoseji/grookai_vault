import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const OUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'special_variant_discovery_v1');
const OUT_JSON = path.join(OUT_DIR, 'special_variant_discovery_v1.json');
const OUT_MD = path.join(OUT_DIR, 'special_variant_discovery_v1.md');
const CANDIDATES_JSON = path.join(OUT_DIR, 'special_variant_candidate_index_v1.json');
const CANDIDATES_MD = path.join(OUT_DIR, 'special_variant_candidate_index_v1.md');
const DB_GAP_JSON = path.join(OUT_DIR, 'special_variant_db_gap_report_v1.json');
const DB_GAP_MD = path.join(OUT_DIR, 'special_variant_db_gap_report_v1.md');

const VERSION = 'SPECIAL_VARIANT_DISCOVERY_V1';
const BULBAPEDIA_ERROR_CARDS = 'https://bulbapedia.bulbagarden.net/wiki/Error_cards';
const BULBAPEDIA_JUNGLE = 'https://bulbapedia.bulbagarden.net/wiki/Jungle_%28TCG%29';
const ELITEFOURUM_ERRORS = 'https://www.elitefourum.com/t/masters-guide-for-pokemon-wotc-corrected-errors-test-cards/29328';
const ELITEFOURUM_PIKACHU = 'https://www.elitefourum.com/t/base-pikachu-artwork-card-variations/15059';
const BIG_ORBIT_BASE_SET_EDITIONS = 'https://www.bigorbitcards.co.uk/pokemon-base-set-how-to-tell-what-edition-you-have.html';
const BULBAPEDIA_WOTC_PROMOS = 'https://bulbapedia.bulbagarden.net/wiki/Wizards_Black_Star_Promos_%28TCG%29';
const ELITEFOURUM_WOTC_PROMO_IMAGES = 'https://www.elitefourum.com/t/wizards-of-the-coast-black-star-promos-hd-image-list-eng/31020';
const BULBAPEDIA_BEEDRILL_BASE_17 = 'https://bulbapedia.bulbagarden.net/wiki/Beedrill_%28Base_Set_17%29';
const PSA_BEEDRILL_D_EFENDING_SPEC = 'https://www.psacard.com/spec/psa/8859750';
const ELITEFOURUM_BASE_SET_ERRORS_UNLIMITED = 'https://www.elitefourum.com/t/base-set-error-cards-exclusive-to-unlimited-set/25307';
const ELITEFOURUM_FOSSIL_ZAPDOS_GUIDE = 'https://www.elitefourum.com/t/guide-to-understanding-fossil-zapdos-15-62-variants/30830';
const TCGONE_WOTC_ERRATAS = 'https://forum.tcgone.net/t/wotc-erratas-complete-list/9383';
const CGC_NINETALES_BLACK_FLAME = 'https://www.cgccards.com/news/article/8861/pokemon-ninetales-variant/';

function pc(setSlug, itemSlug) {
  return `https://www.pricecharting.com/game/${setSlug}/${itemSlug}`;
}

const jungleNoSymbol = [
  ['1', 'Clefable', 'clefable-no-symbol-1'],
  ['2', 'Electrode', 'electrode-no-symbol-2'],
  ['3', 'Flareon', 'flareon-no-symbol-3'],
  ['4', 'Jolteon', 'jolteon-no-symbol-4'],
  ['5', 'Kangaskhan', 'kangaskhan-no-symbol-5'],
  ['6', 'Mr. Mime', 'mr-mime-no-symbol-6'],
  ['7', 'Nidoqueen', 'nidoqueen-no-symbol-7'],
  ['8', 'Pidgeot', 'pidgeot-no-symbol-8'],
  ['9', 'Pinsir', 'pinsir-no-symbol-9'],
  ['10', 'Scyther', 'scyther-no-symbol-10'],
  ['11', 'Snorlax', 'snorlax-no-symbol-11'],
  ['12', 'Vaporeon', 'vaporeon-no-symbol-12'],
  ['13', 'Venomoth', 'venomoth-no-symbol-13'],
  ['14', 'Victreebel', 'victreebel-no-symbol-14'],
  ['15', 'Vileplume', 'vileplume-no-symbol-15'],
  ['16', 'Wigglytuff', 'wigglytuff-no-symbol-16'],
];

const basePikachuVariants = [
  {
    candidate_key: 'base1-58-pikachu-shadowless-red-cheeks',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '58',
    card_name: 'Pikachu',
    proposed_variant_key: 'shadowless_red_cheeks',
    proposed_identity_modifier: 'print_run:shadowless;color:red_cheeks',
    proposed_finish_key: 'normal',
    classification: 'canonical_print_lane',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Base Pikachu guide identifies English Shadowless non-1st edition Red Cheeks as a distinct variant.'),
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies Red Cheeks Pikachu #58/102 as found in 1st edition and Shadowless Base Set packs.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'pikachu-shadowless-red-cheeks-58'), 'PriceCharting exact product: Pikachu [Shadowless Red Cheeks] #58.'),
    ],
  },
  {
    candidate_key: 'base1-58-pikachu-shadowless-yellow-cheeks',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '58',
    card_name: 'Pikachu',
    proposed_variant_key: 'shadowless_yellow_cheeks',
    proposed_identity_modifier: 'print_run:shadowless;color:yellow_cheeks',
    proposed_finish_key: 'normal',
    classification: 'canonical_print_lane',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Base Pikachu guide identifies English Shadowless non-1st edition Yellow Cheeks as a distinct variant.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'pikachu-shadowless-58'), 'PriceCharting exact product: Pikachu [Shadowless] #58.'),
    ],
  },
  {
    candidate_key: 'base1-58-pikachu-first-edition-red-cheeks',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '58',
    card_name: 'Pikachu',
    proposed_variant_key: 'first_edition_red_cheeks',
    proposed_identity_modifier: 'edition:first_edition;print_run:shadowless;color:red_cheeks',
    proposed_finish_key: 'normal',
    classification: 'canonical_print_lane',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Base Pikachu guide identifies English Shadowless 1st edition Red Cheeks.'),
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide states Red Cheeks is found within 1st edition and Shadowless Base Set booster packs.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'pikachu-1st-edition-red-cheeks-58'), 'PriceCharting exact product: Pikachu [1st Edition Red Cheeks] #58.'),
    ],
  },
  {
    candidate_key: 'base1-58-pikachu-first-edition-yellow-cheeks',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '58',
    card_name: 'Pikachu',
    proposed_variant_key: 'first_edition_yellow_cheeks',
    proposed_identity_modifier: 'edition:first_edition;print_run:shadowless;color:yellow_cheeks',
    proposed_finish_key: 'normal',
    classification: 'canonical_print_lane',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Base Pikachu guide identifies English Shadowless 1st edition Yellow Cheeks as a distinct variant.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'pikachu-1st-edition-58'), 'PriceCharting exact product: Pikachu [1st Edition] #58 includes Yellow Cheeks listings.'),
    ],
  },
  {
    candidate_key: 'base1-58-pikachu-ghost-stamp',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '58',
    card_name: 'Pikachu',
    proposed_variant_key: 'ghost_stamp_shadowless',
    proposed_identity_modifier: 'print_run:shadowless;stamp_error:ghost_first_edition',
    proposed_finish_key: 'normal',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia identifies Ghost Stamp Pikachu as a yellow-cheeks shadowless design error with incomplete 1st Edition stamp traces found in gold-strip Shadowless Zap! theme decks.'),
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies Ghost stamp Shadowless Pikachu #58/102 and its Zap! theme deck source.'),
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Base Pikachu guide documents English Ghost stamped Pikachu and notes it is well-known rather than one-of-one.'),
    ],
  },
  {
    candidate_key: 'base1-58-pikachu-grey-first-edition-stamp',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '58',
    card_name: 'Pikachu',
    proposed_variant_key: 'grey_first_edition_stamp',
    proposed_identity_modifier: 'edition:first_edition;stamp_variant:grey_stamp',
    proposed_finish_key: 'normal',
    classification: 'recognized_error_variant',
    confidence: 'medium',
    status: 'needs_second_source',
    evidence: [
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Base Pikachu guide documents English Grey 1st edition stamp Yellow Cheeks and explains the grey-stamp theory.'),
    ],
  },
  {
    candidate_key: 'base1-58-pikachu-e3-red-cheeks',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '58',
    card_name: 'Pikachu',
    proposed_variant_key: 'e3_stamp_red_cheeks',
    proposed_identity_modifier: 'stamp:e3;color:red_cheeks',
    proposed_finish_key: 'normal',
    classification: 'stamp_or_release_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Base Pikachu guide identifies English Red Cheeks E3 stamped Pikachu and distinguishes it from Yellow Cheeks E3.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'pikachu-e3-red-cheeks-58'), 'PriceCharting exact product: Pikachu [E3 Red Cheeks] #58.'),
    ],
  },
  {
    candidate_key: 'base1-58-pikachu-e3-yellow-cheeks',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '58',
    card_name: 'Pikachu',
    proposed_variant_key: 'e3_stamp_yellow_cheeks',
    proposed_identity_modifier: 'stamp:e3;color:yellow_cheeks',
    proposed_finish_key: 'normal',
    classification: 'stamp_or_release_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Base Pikachu guide identifies English Yellow Cheeks E3 stamped Pikachu.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'pikachu-e3-58'), 'PriceCharting exact product: Pikachu [E3] #58.'),
    ],
  },
];

const recognizedErrorVariants = [
  {
    candidate_key: 'base1-12-ninetales-no-damage',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '12',
    card_name: 'Ninetales',
    proposed_variant_key: 'no_damage_error',
    proposed_identity_modifier: 'recognized_error:no_damage',
    proposed_finish_key: 'holo',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia catalogs Base Set Ninetales recognized printing errors.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'ninetales-no-damage-12'), 'PriceCharting exact product: Ninetales [No Damage] #12.'),
      evidence('elitefourum_black_flame_ninetales', 'collector_reference', 'https://www.elitefourum.com/t/the-black-flame-ninetales/29619', 'Elite Fourum discussion links No Damage Ninetales to the original Black Flame/shadowless print context.'),
    ],
  },
  {
    candidate_key: 'base1-12-ninetales-black-flame',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '12',
    card_name: 'Ninetales',
    proposed_variant_key: 'black_flame_error',
    proposed_identity_modifier: 'recognized_error:black_flame',
    proposed_finish_key: 'holo',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_black_flame_ninetales', 'collector_reference', 'https://www.elitefourum.com/t/the-black-flame-ninetales/29619', 'Elite Fourum documents the Black Flame Ninetales distinction and notes collector debate about whether it is an error or original artwork state.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'ninetales-black-flame-12'), 'PriceCharting exact product: Ninetales [Black Flame] #12.'),
      evidence('cgc_ninetales_black_flame', 'collector_reference', CGC_NINETALES_BLACK_FLAME, 'CGC identifies the Black Flame Ninetales as a distinct Base Set variant and explains the artwork difference from normal unlimited copies.'),
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia states Wizards changed the Ninetales artwork early during unlimited print, making black-flame unlimited copies less common.'),
    ],
  },
  {
    candidate_key: 'base1-2-blastoise-stage-error',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '2',
    card_name: 'Blastoise',
    proposed_variant_key: 'stage_error',
    proposed_identity_modifier: 'recognized_error:missing_stage_text',
    proposed_finish_key: 'holo',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia lists Missing/No stage Blastoise as a Base Set unlimited error.'),
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies Missing/No stage Blastoise #2/102.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'blastoise-stage-error-2'), 'PriceCharting exact product: Blastoise [Stage Error] #2.'),
    ],
  },
  {
    candidate_key: 'base1-17-beedrill-d-fending-error',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '17',
    card_name: 'Beedrill',
    proposed_variant_key: 'd_fending_error',
    proposed_identity_modifier: 'recognized_error:d_fending_text',
    proposed_finish_key: 'normal',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies the “D.fending” Beedrill error text.'),
      evidence('bulbapedia_beedrill_base_17', 'human_readable_checklist', BULBAPEDIA_BEEDRILL_BASE_17, 'Bulbapedia Beedrill Base Set 17 page states a few copies were printed with “D.efending” in Poison Sting attack text.'),
      evidence('psa_beedrill_d_efending_spec', 'collector_reference', PSA_BEEDRILL_D_EFENDING_SPEC, 'PSA spec page identifies 1999 Pokemon Game Beedrill #17 “d. Efending” Error.'),
    ],
  },
  {
    candidate_key: 'base1-47-diglett-sideways-fighting-energy',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '47',
    card_name: 'Diglett',
    proposed_variant_key: 'sideways_fighting_energy_error',
    proposed_identity_modifier: 'recognized_error:sideways_fighting_energy',
    proposed_finish_key: 'normal',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies Sideways Fighting energy Diglett #47/102 found in Base Set 2-Player Starter decks.'),
      evidence('elitefourum_base_set_errors_unlimited', 'collector_reference', ELITEFOURUM_BASE_SET_ERRORS_UNLIMITED, 'Elite Fourum Base Set error discussion lists Diglett #47/102 Sideways Fighting Energy as an unlimited Base Set error.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'diglett-fight-symbol-error-47'), 'PriceCharting exact product: Diglett [Fight Symbol Error] #47.'),
    ],
  },
  {
    candidate_key: 'base3-15-zapdos-missing-holo-evolution-box',
    set_key: 'base3',
    set_name: 'Fossil',
    card_number: '15',
    card_name: 'Zapdos',
    proposed_variant_key: 'missing_holo_evolution_box_error',
    proposed_identity_modifier: 'recognized_error:missing_holo_evolution_box',
    proposed_finish_key: 'holo',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies Missing holo in Evolution box Zapdos #15/62.'),
      evidence('elitefourum_fossil_zapdos_guide', 'collector_reference', ELITEFOURUM_FOSSIL_ZAPDOS_GUIDE, 'Elite Fourum Fossil Zapdos variant guide documents the holo evolution box error on Zapdos #15/62 and explains the late corrected unlimited print.'),
      evidence('pricecharting_corrected_product', 'marketplace_checklist', pc('pokemon-fossil', 'zapdos-corrected-15'), 'PriceCharting exact corrected-product page says corrected Zapdos #15 has no “Evolution Box” error like the original printing.'),
    ],
  },
  {
    candidate_key: 'basep-1-ivy-pikachu-first-edition',
    set_key: 'basep',
    set_name: 'Wizards Black Star Promos',
    card_number: '1',
    card_name: 'Pikachu',
    proposed_variant_key: 'first_edition',
    proposed_identity_modifier: 'edition:first_edition',
    proposed_finish_key: 'normal',
    classification: 'canonical_print_lane',
    confidence: 'high',
    status: 'already_likely_in_db',
    notes: 'Release context is Jungle secret/chase distribution, but the DB identity modifier should remain edition:first_edition unless a separate release modifier is formally approved.',
    evidence: [
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia classifies Ivy Pikachu 1st Edition as incorrectly regarded as an error and documents it as intentional secret/chase style distribution in 1st Edition Jungle packs.'),
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Base Pikachu guide references Ivy Pikachu / Black Star Promo #1 1st edition context.'),
    ],
  },
];

const candidates = [
  ...basePikachuVariants,
  ...jungleNoSymbol.map(([number, name, slug]) => ({
    candidate_key: `base2-${number}-${slug}`,
    set_key: 'base2',
    set_name: 'Jungle',
    card_number: number,
    card_name: name,
    proposed_variant_key: 'no_symbol_error',
    proposed_identity_modifier: 'recognized_error:no_jungle_symbol',
    proposed_finish_key: 'holo',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('bulbapedia_jungle_tcg', 'human_readable_checklist', BULBAPEDIA_JUNGLE, 'Bulbapedia Jungle page states all English Holofoil Rares in unlimited Jungle were accidentally printed as error cards without set symbol.'),
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia error-card page documents No Symbol Errors as a large print run of unlimited Jungle holo rares.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-jungle', slug), `PriceCharting exact product: ${name} [No Symbol] #${number}.`),
    ],
  })),
  ...recognizedErrorVariants,
  {
    candidate_key: 'base1-42-wartortle-evolution-box-error',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '42',
    card_name: 'Wartortle',
    proposed_variant_key: 'evolution_box_error',
    proposed_identity_modifier: 'recognized_error:evolution_box_wartortle',
    proposed_finish_key: 'normal',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia identifies Evolution Box Wartortle as a corrected design error in a short English unlimited print run.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-base-set', 'wartortle-evolution-box-error-42'), 'PriceCharting exact product: Wartortle [Evolution Box Error] #42.'),
    ],
  },
  {
    candidate_key: 'base5-5-dark-dragonite-nonholo-error',
    set_key: 'base5',
    set_name: 'Team Rocket',
    card_number: '5',
    card_name: 'Dark Dragonite',
    proposed_variant_key: 'nonholo_error',
    proposed_identity_modifier: 'recognized_error:nonholo_holo_number',
    proposed_finish_key: 'normal',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia identifies Nonholo Dark Dragonite #5 as a Team Rocket design error mass produced in unlimited and present in 1st edition.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-team-rocket', 'dark-dragonite-error-5'), 'PriceCharting exact product: Dark Dragonite [Error] #5.'),
    ],
  },
  {
    candidate_key: 'gym2-119-rockets-minefield-gym-corrected-text-lane',
    set_key: 'gym2',
    set_name: 'Gym Challenge',
    card_number: '119',
    card_name: "Rocket's Minefield Gym",
    proposed_variant_key: 'corrected_text_variant',
    proposed_identity_modifier: 'text_variant:corrected_damage_counter_text',
    proposed_finish_key: 'normal',
    classification: 'recognized_correction_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies Rocket’s Minefield Gym corrected text as an English Gym Challenge corrected error family.'),
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia states Rocket’s Minefield Gym was corrected very late in the unlimited print run and that corrected unlimited copies are rarer.'),
      evidence('pricecharting_exact_product', 'marketplace_checklist', pc('pokemon-gym-challenge', 'rocket%27s-minefield-gym-119'), 'PriceCharting Rocket’s Minefield Gym #119 page includes corrected-card sales and error sales as separate title evidence.'),
      evidence('tcgone_wotc_erratas', 'collector_reference', TCGONE_WOTC_ERRATAS, 'TCG ONE WotC errata list notes scans of the corrected Rocket’s Minefield Gym version printed in later Gym Challenge packs.'),
    ],
  },
  {
    candidate_key: 'basep-17-dark-persian-no-hp-error',
    set_key: 'basep',
    set_name: 'Wizards Black Star Promos',
    card_number: '17',
    card_name: 'Dark Persian',
    proposed_variant_key: 'no_hp_error',
    proposed_identity_modifier: 'recognized_error:missing_hp',
    proposed_finish_key: 'holo',
    classification: 'recognized_error_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia identifies Dark Persian Black Star Promo copies printed without HP.'),
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies Missing/No HP Dark Persian #17 Black Star promo.'),
    ],
  },
  ...[
    ['21', 'Moltres'],
    ['22', 'Articuno'],
    ['23', 'Zapdos'],
  ].map(([number, name]) => ({
    candidate_key: `basep-${number}-${normalizeKey(name)}-incorrect-artist`,
    set_key: 'basep',
    set_name: 'Wizards Black Star Promos',
    card_number: number,
    card_name: name,
    proposed_variant_key: 'incorrect_artist_variant',
    proposed_identity_modifier: 'text_variant:incorrect_artist_toshinao_aoki',
    proposed_finish_key: 'normal',
    classification: 'recognized_correction_variant',
    confidence: 'high',
    status: 'master_index_ready',
    evidence: [
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia identifies the Legendary Bird promos as early prints with incorrect Toshinao Aoki artist credit, corrected to Naoyo Kimura in later prints.'),
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies Zapdos, Articuno, and Moltres Black Star promos #21-23 as incorrect-artist corrected variants.'),
    ],
  })),
  ...[
    ['2', 'Electabuzz'],
    ['3', 'Mewtwo'],
    ['4', 'Pikachu'],
    ['5', 'Dragonite'],
  ].flatMap(([number, name]) => [
    {
      candidate_key: `basep-${number}-${normalizeKey(name)}-wb-kids-stamp`,
      set_key: 'basep',
      set_name: 'Wizards Black Star Promos',
      card_number: number,
      card_name: name,
      proposed_variant_key: 'wb_kids_stamp',
      proposed_identity_modifier: 'stamp:wb_kids_first_movie',
      proposed_finish_key: 'normal',
      classification: 'stamp_or_release_variant',
      confidence: 'high',
      status: 'master_index_ready',
      evidence: [
        evidence('bulbapedia_wotc_promos', 'human_readable_checklist', BULBAPEDIA_WOTC_PROMOS, 'Bulbapedia identifies Wizards Black Star Promos #2-5 as Mewtwo Strikes Back theatrical-release cards with a Kids WB Presents: Pokemon The First Movie gold foil stamp.'),
        evidence('elitefourum_wotc_promo_images', 'collector_reference', ELITEFOURUM_WOTC_PROMO_IMAGES, 'Elite Fourum WOTC promo image list distinguishes the regular WB Stamp versions of promos #2-5.'),
      ],
    },
    {
      candidate_key: `basep-${number}-${normalizeKey(name)}-inverted-wb-kids-stamp`,
      set_key: 'basep',
      set_name: 'Wizards Black Star Promos',
      card_number: number,
      card_name: name,
      proposed_variant_key: 'inverted_wb_kids_stamp',
      proposed_identity_modifier: 'recognized_error:inverted_wb_kids_stamp',
      proposed_finish_key: 'normal',
      classification: 'recognized_error_variant',
      confidence: 'high',
      status: 'master_index_ready',
      evidence: [
        evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia identifies inverted WB Kids stamp versions of Black Star Promos #2-5 and reports a very small production population.'),
        evidence('elitefourum_wotc_promo_images', 'collector_reference', ELITEFOURUM_WOTC_PROMO_IMAGES, 'Elite Fourum WOTC promo image list includes inverted WB Stamp versions for the first-movie promo cards.'),
      ],
    },
    {
      candidate_key: `basep-${number}-${normalizeKey(name)}-missing-wb-kids-stamp`,
      set_key: 'basep',
      set_name: 'Wizards Black Star Promos',
      card_number: number,
      card_name: name,
      proposed_variant_key: 'missing_wb_kids_stamp',
      proposed_identity_modifier: 'recognized_error:missing_wb_kids_stamp',
      proposed_finish_key: 'normal',
      classification: 'recognized_error_variant',
      confidence: 'medium',
      status: ['3', '4', '5'].includes(number) ? 'master_index_ready' : 'needs_second_source',
      evidence: [
        evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia identifies missing WB Kids stamp versions of Black Star Promos #2-5.'),
        ...(number === '4' ? [evidence('elitefourum_wotc_promo_images', 'collector_reference', ELITEFOURUM_WOTC_PROMO_IMAGES, 'Elite Fourum WOTC promo image list explicitly includes Pikachu #4 Missing WB Stamp.')] : []),
        ...(['3', '5'].includes(number) ? [evidence('elitefourum_wotc_promo_images_missing_wb_comment', 'collector_reference', ELITEFOURUM_WOTC_PROMO_IMAGES, 'Elite Fourum WOTC promo variant discussion states missing-stamp Mewtwo and Dragonite have been seen in collector holdings.')] : []),
      ],
    },
  ]),
  {
    candidate_key: 'base6-75-exeggcute-legendary-collection-reverse-holo-shift-review',
    set_key: 'base6',
    set_name: 'Legendary Collection',
    card_number: '75',
    card_name: 'Exeggcute',
    proposed_variant_key: 'reverse_holo_shift_error',
    proposed_identity_modifier: 'recognized_error:legendary_collection_reverse_holo_shift',
    proposed_finish_key: 'reverse',
    classification: 'recognized_error_variant',
    confidence: 'medium',
    status: 'needs_second_source',
    evidence: [
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, 'WOTC corrected-errors guide identifies misaligned holo errors across Legendary Collection cards, with known collector discussion around Exeggcute reverse-holo correction/error states.'),
    ],
  },
  {
    candidate_key: 'base1-family-shadowless-print-run',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '*',
    card_name: 'Base Set shadowless print-run family',
    proposed_variant_key: 'shadowless_print_run_family',
    proposed_identity_modifier: 'print_run:shadowless',
    proposed_finish_key: null,
    classification: 'set_level_print_run_family',
    confidence: 'high',
    status: 'family_rule_ready_needs_row_expansion',
    db_compare_mode: 'family_rule',
    evidence: [
      evidence('big_orbit_base_set_editions', 'collector_reference', BIG_ORBIT_BASE_SET_EDITIONS, 'Big Orbit identifies Shadowless Edition as an English Base Set edition/print run and explains how it differs from Unlimited.'),
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Elite Fourum Base Pikachu taxonomy describes Base Set print-run sequence including 1st edition Shadowless, non-1st Shadowless, Unlimited, and 1999-2000 UK print.'),
    ],
  },
  {
    candidate_key: 'base1-family-1999-2000-uk-print-run',
    set_key: 'base1',
    set_name: 'Base Set',
    card_number: '*',
    card_name: 'Base Set 1999-2000 UK print-run family',
    proposed_variant_key: '1999_2000_uk_print_run_family',
    proposed_identity_modifier: 'print_run:1999_2000_uk',
    proposed_finish_key: null,
    classification: 'set_level_print_run_family',
    confidence: 'high',
    status: 'family_rule_ready_needs_row_expansion',
    db_compare_mode: 'family_rule',
    evidence: [
      evidence('big_orbit_base_set_editions', 'collector_reference', BIG_ORBIT_BASE_SET_EDITIONS, 'Big Orbit identifies UK Print / 4th Print / Base Set 2000 as the final and smallest English Base Set print run with 1999-2000 copyright text.'),
      evidence('elitefourum_base_pikachu_variants', 'collector_reference', ELITEFOURUM_PIKACHU, 'Elite Fourum Base Pikachu taxonomy references the 1999-2000 UK print as a Base Set print-run variant.'),
    ],
  },
  ...[
    ['copy-error-crimped-edge', 'Crimped Edge cards', 'item_level_error_only', 'Packing/sealing crimp errors vary by individual copy and should remain vault/item-level attributes, not canonical parent lanes.'],
    ['copy-error-miscut-offcenter', 'Mis-cut / off-center cards', 'item_level_error_only', 'Miscut and off-center cards vary by individual copy and grading standard; they should not create Master Index parent rows.'],
    ['copy-error-holo-bleed-general', 'General holo bleed cards', 'item_level_error_only', 'Holo bleed can occur across many sets in varying degree; only explicitly repeatable named cases should become parent lanes.'],
    ['copy-error-filler-cards', 'Filler / blank / color-bar cards', 'item_level_error_only', 'Filler and blank cards are production artifacts without normal card identity; route to item-level or separate oddity catalog, not canonical card_prints.'],
  ].map(([key, name, status, label]) => ({
    candidate_key: key,
    set_key: 'various',
    set_name: 'Various',
    card_number: '*',
    card_name: name,
    proposed_variant_key: key.replace('copy-error-', ''),
    proposed_identity_modifier: null,
    proposed_finish_key: null,
    classification: 'item_level_error_only',
    confidence: 'high',
    status,
    db_compare_mode: 'item_level_only',
    evidence: [
      evidence('elitefourum_wotc_error_guide', 'collector_reference', ELITEFOURUM_ERRORS, label),
      evidence('bulbapedia_error_cards', 'human_readable_checklist', BULBAPEDIA_ERROR_CARDS, 'Bulbapedia catalogs this as a production/misprint phenomenon rather than a stable card identity lane.'),
    ],
  })),
];

function evidence(sourceKey, sourceKind, sourceUrl, evidenceLabel) {
  return {
    source_key: sourceKey,
    source_kind: sourceKind,
    source_url: sourceUrl,
    evidence_label: evidenceLabel,
  };
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

async function dbPresence(client, rows) {
  const skippedRows = rows.filter((row) => row.db_compare_mode === 'family_rule' || row.db_compare_mode === 'item_level_only');
  const comparableRows = rows.filter((row) => !row.db_compare_mode);

  if (!client) {
    return rows.map((row) => ({
      ...row,
      db_status: 'db_not_checked',
      db_matches: [],
    }));
  }

  if (comparableRows.length === 0) {
    return skippedRows.map((row) => ({
      ...row,
      db_status: row.db_compare_mode === 'family_rule' ? 'family_rule_not_expanded' : 'item_level_not_db_lane',
      db_matches: [],
    }));
  }

  const result = await client.query(
    `with target as (
       select * from jsonb_to_recordset($1::jsonb) as t(
         candidate_key text,
         set_key text,
         card_number text,
         card_name text,
         proposed_variant_key text,
         proposed_identity_modifier text
       )
     )
     select
       target.candidate_key,
       cp.id::text as card_print_id,
       cp.gv_id,
       cp.set_code,
       cp.number,
       cp.name,
       cp.variant_key,
       cp.printed_identity_modifier,
       array_agg(cpr.finish_key order by cpr.finish_key) filter (where cpr.id is not null) as child_finishes
     from target
     join public.card_prints cp
       on cp.set_code = target.set_key
      and cp.number = target.card_number
      and lower(cp.name) = lower(target.card_name)
      and (
        coalesce(cp.variant_key, '') = target.proposed_variant_key
        or coalesce(cp.printed_identity_modifier, '') = target.proposed_identity_modifier
        or coalesce(cp.printed_identity_modifier, '') like '%' || target.proposed_variant_key || '%'
        or coalesce(cp.variant_key, '') like '%' || target.proposed_identity_modifier || '%'
      )
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     group by target.candidate_key, cp.id
     order by target.candidate_key, cp.id`,
    [JSON.stringify(comparableRows.map((row) => ({
      candidate_key: row.candidate_key,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      proposed_variant_key: row.proposed_variant_key,
      proposed_identity_modifier: row.proposed_identity_modifier,
    })))],
  );

  const matchesByKey = new Map();
  for (const match of result.rows) {
    if (!matchesByKey.has(match.candidate_key)) matchesByKey.set(match.candidate_key, []);
    matchesByKey.get(match.candidate_key).push(match);
  }

  const comparableResults = comparableRows.map((row) => {
    const matches = matchesByKey.get(row.candidate_key) ?? [];
    const hasFinish = matches.some((match) => (match.child_finishes ?? []).includes(row.proposed_finish_key));
    let dbStatus = 'missing_from_db';
    if (matches.length > 0 && hasFinish) dbStatus = 'already_in_db';
    else if (matches.length > 0) dbStatus = 'parent_exists_missing_child_finish';
    return {
      ...row,
      db_status: dbStatus,
      db_matches: matches,
    };
  });

  return [
    ...comparableResults,
    ...skippedRows.map((row) => ({
      ...row,
      db_status: row.db_compare_mode === 'family_rule' ? 'family_rule_not_expanded' : 'item_level_not_db_lane',
      db_matches: [],
    })),
  ].sort((left, right) => left.candidate_key.localeCompare(right.candidate_key));
}

function governanceStatus(row) {
  if (row.db_compare_mode === 'item_level_only') return 'blocked_item_level_only';
  if (row.db_compare_mode === 'family_rule') return 'family_rule_ready';
  if (row.status === 'needs_second_source' || row.status === 'needs_manual_review') return row.status;
  if (row.evidence.length >= 2 && row.evidence.some((item) => item.source_kind !== 'marketplace_checklist')) return 'source_ready';
  return 'needs_second_source';
}

function renderMain(report) {
  return `# Special Variant Discovery V1

Audit-only Master Index expansion pass for special print lanes, recognized error variants, correction variants, and high-value WOTC cases.

## Guardrails

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- production_apply_performed: ${report.production_apply_performed}

## Summary

${markdownTable(['metric', 'value'], Object.entries(report.summary).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]))}

## Modeling Rules

- Shadowless is an identity / print-run modifier, not a finish.
- First Edition is an edition identity modifier, not a finish.
- Red Cheeks / Yellow Cheeks is an artwork-color identity lane.
- No Symbol Jungle is a recognized error variant lane on unlimited Jungle holo rares.
- Random one-off manufacturing errors remain copy-level attributes unless source-backed as repeatable named variants.

## Top Missing From DB

${markdownTable(['set', 'number', 'name', 'variant', 'class', 'status'], report.rows.filter((row) => row.db_status !== 'already_in_db').slice(0, 40).map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.proposed_variant_key,
    row.classification,
    row.db_status,
  ]))}

## Source Universe Used

${markdownTable(['source', 'usage'], [
    ['Bulbapedia Error cards', 'broad WOTC and later recognized error discovery'],
    ['Bulbapedia Wizards Black Star Promos', 'WB Kids first-movie stamp and promo release context'],
    ['Bulbapedia Jungle set page', 'set-level proof for Jungle No Symbol holo family'],
    ['Elite Fourum WOTC corrected-errors guide', 'collector checklist/source text for corrected errors and Base/Jungle errors'],
    ['Elite Fourum Base Pikachu variants', 'deep Pikachu print-run/color/stamp taxonomy'],
    ['Elite Fourum WOTC promo image list', 'regular/inverted/missing WB-stamp promo image taxonomy'],
    ['Big Orbit Base Set edition guide', 'Shadowless and 1999-2000 UK Base Set family-rule evidence'],
    ['PriceCharting exact product pages', 'marketplace checklist corroboration for named variants'],
  ])}
`;
}

function renderCandidateIndex(report) {
  return `# Special Variant Candidate Index V1

${markdownTable(['set', 'number', 'name', 'variant', 'classification', 'governance', 'db_status', 'sources'], report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.proposed_variant_key,
    row.classification,
    row.governance_status,
    row.db_status,
    row.evidence.length,
  ]))}
`;
}

function renderDbGap(report) {
  return `# Special Variant DB Gap Report V1

Read-only comparison of discovered special variants against current Grookai parent lanes.

## Summary

${markdownTable(['status', 'count'], Object.entries(report.summary.by_db_status ?? {}).map(([key, value]) => [key, value]))}

## Missing / Incomplete

${markdownTable(['set', 'number', 'name', 'variant', 'finish', 'db_status', 'governance'], report.rows.filter((row) => row.db_status !== 'already_in_db').map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.proposed_variant_key,
    row.proposed_finish_key,
    row.db_status,
    row.governance_status,
  ]))}
`;
}

async function main() {
  const conn = connectionString();
  let client = null;
  if (conn) {
    client = new Client({ connectionString: conn });
    await client.connect();
  }

  let rows;
  try {
    rows = await dbPresence(client, candidates);
  } finally {
    if (client) await client.end().catch(() => {});
  }

  rows = rows.map((row) => ({
    ...row,
    source_count: row.evidence.length,
    governance_status: governanceStatus(row),
  }));

  const summary = {
    candidate_rows: rows.length,
    by_classification: countBy(rows, (row) => row.classification),
    by_governance_status: countBy(rows, (row) => row.governance_status),
    by_db_status: countBy(rows, (row) => row.db_status),
    master_index_ready_missing_from_db: rows.filter((row) => !row.db_compare_mode && row.governance_status === 'source_ready' && row.db_status !== 'already_in_db').length,
    needs_second_source_or_review: rows.filter((row) => row.governance_status !== 'source_ready').length,
    family_rule_rows: rows.filter((row) => row.db_compare_mode === 'family_rule').length,
    item_level_excluded_rows: rows.filter((row) => row.db_compare_mode === 'item_level_only').length,
  };

  const report = {
    generated_at: new Date().toISOString(),
    version: VERSION,
    mode: 'audit_only_master_index_expansion',
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    production_apply_performed: false,
    fingerprint_sha256: sha256(stableJson(rows.map((row) => ({
      candidate_key: row.candidate_key,
      proposed_variant_key: row.proposed_variant_key,
      proposed_identity_modifier: row.proposed_identity_modifier,
      proposed_finish_key: row.proposed_finish_key,
      governance_status: row.governance_status,
      db_status: row.db_status,
      evidence_urls: row.evidence.map((item) => item.source_url),
    })))),
    summary,
    rows,
  };

  await writeJson(OUT_JSON, report);
  await writeText(OUT_MD, renderMain(report));
  await writeJson(CANDIDATES_JSON, { ...report, artifact: 'special_variant_candidate_index_v1' });
  await writeText(CANDIDATES_MD, renderCandidateIndex(report));
  await writeJson(DB_GAP_JSON, { ...report, artifact: 'special_variant_db_gap_report_v1' });
  await writeText(DB_GAP_MD, renderDbGap(report));

  console.log(JSON.stringify({
    output_json: rel(OUT_JSON),
    candidate_index_json: rel(CANDIDATES_JSON),
    db_gap_json: rel(DB_GAP_JSON),
    fingerprint_sha256: report.fingerprint_sha256,
    summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
